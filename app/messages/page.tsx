'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FaArrowLeft, FaPaperPlane, FaInbox, FaSearch } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

// Message types
interface User {
  id: string;
  name: string | null;
  image: string | null;
}

interface Message {
  id: string;
  content: string;
  createdAt: string;
  readAt: string | null;
  sender: User;
  senderId: string;
  conversationId: string;
}

interface Conversation {
  id: string;
  participants: User[];
  messages: Message[];
  lastMessageAt: string;
  unreadCount?: number;
}

const MessagesPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationId = searchParams.get('conversation');
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Fetch conversations
  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/messages');
      if (!response.ok) throw new Error('Failed to fetch conversations');
      
      const data = await response.json();
      setConversations(data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error('Could not load conversations');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch messages for a specific conversation
  const fetchMessages = async (convId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/messages?conversationId=${convId}`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      
      const data = await response.json();
      setActiveConversation(data.conversation);
      setMessages(data.messages);
      
      // Update the unread count for this conversation in the list
      setConversations(prevConversations => 
        prevConversations.map(conv => 
          conv.id === convId ? { ...conv, unreadCount: 0 } : conv
        )
      );
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Could not load messages');
    } finally {
      setLoading(false);
      // Scroll to bottom after messages load
      setTimeout(scrollToBottom, 100);
    }
  };
  
  // Send a new message
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;
    if (!activeConversation) return;
    
    setSendingMessage(true);
    
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: activeConversation.id,
          content: newMessage,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to send message');
      
      const sentMessage = await response.json();
      
      // Add the new message to the conversation
      setMessages(prev => [...prev, sentMessage]);
      
      // Update the conversation in the list
      setConversations(prevConversations => {
        return prevConversations.map(conv => {
          if (conv.id === activeConversation.id) {
            return {
              ...conv,
              lastMessageAt: new Date().toISOString(),
              messages: [sentMessage],
            };
          }
          return conv;
        }).sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
      });
      
      // Clear the input
      setNewMessage('');
      
      // Scroll to bottom
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };
  
  // Start a new conversation
  const startConversation = async (recipientId: string) => {
    // You'd implement this with a modal to select users, etc.
    // For this implementation, we'll assume the recipientId is passed
    // Perhaps from a profile page "Message" button
    
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientId,
          content: 'Hello! I wanted to connect with you.',
        }),
      });
      
      if (!response.ok) throw new Error('Failed to start conversation');
      
      const newConversation = await response.json();
      
      // Add the new conversation to the list and set it as active
      setConversations(prev => [newConversation, ...prev]);
      router.push(`/messages?conversation=${newConversation.id}`);
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.error('Failed to start conversation');
    }
  };
  
  // Initial load
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    
    if (status === 'authenticated') {
      fetchConversations();
    }
  }, [status, router]);
  
  // Load conversation if ID is provided in URL
  useEffect(() => {
    if (conversationId && status === 'authenticated') {
      fetchMessages(conversationId);
    } else {
      setActiveConversation(null);
      setMessages([]);
    }
  }, [conversationId, status]);
  
  // Redirect if not authenticated
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-primary-600">Loading...</div>
      </div>
    );
  }
  
  // Helper function to get the other participant
  const getOtherParticipant = (conversation: Conversation): User => {
    return conversation.participants.find(p => p.id !== session?.user?.id) || {
      id: '',
      name: 'Unknown User',
      image: null
    };
  };
  
  // Format message timestamp
  const formatMessageTime = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };
  
  // Filter conversations based on search term
  const filteredConversations = conversations.filter(conversation => {
    const otherUser = getOtherParticipant(conversation);
    return otherUser.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
           conversation.messages[0]?.content.toLowerCase().includes(searchTerm.toLowerCase());
  });
  
  return (
    <div className="w-full flex-grow flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-900 p-4 border-b border-gray-800 flex items-center">
        <Link href="/" className="mr-4">
          <FaArrowLeft className="text-white" />
        </Link>
        <h1 className="text-xl font-bold flex items-center">
          <FaInbox className="mr-2" /> Messages
        </h1>
      </div>
      
      {/* Main content - Full width layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Conversations list - Left side */}
        <div className={`w-1/3 border-r border-gray-800 flex flex-col ${activeConversation ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-gray-800">
            <h2 className="text-lg font-semibold">Recent Conversations</h2>
            
            {/* Search conversations */}
            <div className="mt-2 relative">
              <input
                type="text"
                placeholder="Search conversations"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-800 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
              />
              <FaSearch className="absolute left-3 top-2.5 text-gray-500" />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {loading && conversations.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-pulse text-primary-600">Loading conversations...</div>
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                <FaInbox className="text-4xl mb-4 text-gray-600" />
                <p className="text-gray-400">No conversations yet</p>
                <p className="text-sm text-gray-500 mt-2">
                  Start a conversation by visiting a user's profile and clicking "Message"
                </p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                <p className="text-gray-400">No matching conversations</p>
                <p className="text-sm text-gray-500 mt-2">
                  Try a different search term
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {filteredConversations.map(conversation => {
                  const otherUser = getOtherParticipant(conversation);
                  const lastMessage = conversation.messages[0];
                  
                  return (
                    <Link 
                      key={conversation.id}
                      href={`/messages?conversation=${conversation.id}`}
                      className={`flex items-center p-4 hover:bg-gray-800 transition-colors relative ${
                        activeConversation?.id === conversation.id ? 'bg-gray-800' : ''
                      }`}
                    >
                      <div className="relative">
                        <div className="w-12 h-12 relative rounded-full overflow-hidden">
                          <Image
                            src={otherUser.image || 'https://placehold.co/100/5f33e1/ffffff?text=U'}
                            alt={otherUser.name || 'User'}
                            fill
                            className="object-cover"
                          />
                        </div>
                        
                        {conversation.unreadCount ? (
                          <div className="absolute -top-1 -right-1 bg-primary-600 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                            {conversation.unreadCount}
                          </div>
                        ) : null}
                      </div>
                      
                      <div className="ml-3 flex-1 min-w-0">
                        <div className="flex justify-between items-baseline">
                          <h3 className="font-medium truncate">{otherUser.name}</h3>
                          <span className="text-xs text-gray-500 ml-2 whitespace-nowrap">
                            {formatMessageTime(conversation.lastMessageAt)}
                          </span>
                        </div>
                        
                        {lastMessage && (
                          <p className={`text-sm truncate ${conversation.unreadCount ? 'font-medium text-white' : 'text-gray-400'}`}>
                            {lastMessage.sender.id === session?.user?.id ? 'You: ' : ''}
                            {lastMessage.content}
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        
        {/* Conversation - Right side */}
        <div className={`w-2/3 flex flex-col ${!activeConversation ? 'hidden md:flex' : 'flex'}`}>
          {activeConversation ? (
            <>
              {/* Conversation header */}
              <div className="p-4 border-b border-gray-800 flex items-center">
                <button 
                  onClick={() => router.push('/messages')}
                  className="md:hidden mr-3"
                >
                  <FaArrowLeft />
                </button>
                
                <div className="w-10 h-10 relative rounded-full overflow-hidden mr-3">
                  <Image
                    src={getOtherParticipant(activeConversation).image || 'https://placehold.co/100/5f33e1/ffffff?text=U'}
                    alt={getOtherParticipant(activeConversation).name || 'User'}
                    fill
                    className="object-cover"
                  />
                </div>
                
                <div>
                  <h2 className="font-semibold">
                    {getOtherParticipant(activeConversation).name}
                  </h2>
                </div>
              </div>
              
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-950">
                {messages.map(message => {
                  const isOwnMessage = message.senderId === session?.user?.id;
                  
                  return (
                    <div 
                      key={message.id}
                      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isOwnMessage && (
                        <div className="w-8 h-8 relative rounded-full overflow-hidden mr-2 mt-1">
                          <Image
                            src={message.sender.image || 'https://placehold.co/100/5f33e1/ffffff?text=U'}
                            alt={message.sender.name || 'User'}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      
                      <div className="max-w-[70%]">
                        <div 
                          className={`rounded-2xl px-4 py-2 ${
                            isOwnMessage 
                              ? 'bg-primary-600 text-white rounded-tr-none' 
                              : 'bg-gray-800 text-white rounded-tl-none'
                          }`}
                        >
                          <p>{message.content}</p>
                        </div>
                        
                        <div className={`text-xs text-gray-500 mt-1 ${isOwnMessage ? 'text-right' : 'text-left'}`}>
                          {formatMessageTime(message.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {/* Empty state */}
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full">
                    <p className="text-gray-400">No messages yet</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Send a message to start the conversation
                    </p>
                  </div>
                )}
                
                {/* Scroll anchor */}
                <div ref={messagesEndRef} />
              </div>
              
              {/* Message input */}
              <div className="p-4 border-t border-gray-800">
                <form onSubmit={sendMessage} className="flex items-center">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-gray-800 rounded-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-primary-600"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sendingMessage}
                    className={`ml-2 p-2 rounded-full ${
                      !newMessage.trim() || sendingMessage
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-primary-600 text-white hover:bg-primary-700'
                    }`}
                  >
                    <FaPaperPlane />
                  </button>
                </form>
              </div>
            </>
          ) : (
            // Empty state when no conversation is selected
            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
              <div className="bg-gray-800 rounded-full p-6 mb-4">
                <FaInbox className="text-5xl text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Your Messages</h3>
              <p className="text-gray-400 max-w-md">
                Select a conversation from the sidebar to view messages, or start a new conversation by visiting a user's profile.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessagesPage; 