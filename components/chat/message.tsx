"use client";

// MongoDB Chat Component
// 
// This component connects to MongoDB to fetch and send chat messages.
// 
// Required props:
// - userId: string - The current user's ID
//
// MongoDB Collection Structure:
// Collection: "chat"
// Document structure:
// {
//   "_id": ObjectId,
//   "creatorId": string,
//   "message": string, 
//   "createdAt": string (ISO date),
//   "replyTo": string | null (message _id),
//   "recipients": string[] (array of user IDs)
// }
//
// API Endpoints:
// - GET /api/chat?userId={userId} - Fetch user's chats
// - POST /api/chat - Send new message
//
// Environment Variables Required:
// - MONGODB_URI: Your MongoDB connection string

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  Send,
  CornerDownRight,
  Info,
  CornerUpLeft,
  InfoIcon,
} from "lucide-react";
import { fetchChats, fetchUsers, sendMessage, getInquiry, getInquiryByOffering, createInquiry, updateAppointmentStatus, fetchAppointments, updateAppointmentCollectionStatus } from "@/app/actions";
import { useSocket } from "@/hooks/use-socket";

interface Message {
  _id: { $oid: string } | string;
  creatorId: string;
  message: string;
  createdAt: string;
  replyTo: string | null;
  recipients: string[];
  senderRole: 'tutee' | 'tutor';
  type?: 'text' | 'appointment' | 'quiz-result';
  appointment?: {
    datetimeISO: string;
    mode: 'online' | 'in-person';
    status: 'pending' | 'accepted' | 'declined' | 'cancelled';
    subject?: string;
    offeringId?: string;
  };
  quizResult?: {
    appointmentId: string;
    attempt: 1 | 2;
    score: number;
    totalQuestions: number;
    completedAt: string;
    tuteeId: string;
  };
}

// Helper function to get message ID in consistent format
const getMessageId = (message: Message): string => {
  if (typeof message._id === 'string') {
    return message._id;
  }
  if (message._id && typeof message._id === 'object' && '$oid' in message._id) {
    return message._id.$oid;
  }
  // Fallback for any other format
  return String(message._id || '');
};

interface User {
  id: string;
  name: string;
  lastMessage: string;
  unreadCount: number;
  isTyping?: boolean;
  firstName?: string;
  lastName?: string;
  username?: string;
  emailAddress?: string;
  imageUrl?: string;
}

interface Inquiry {
  _id: string;
  tuteeId: string;
  tutorId: string;
  offeringId: string;
  subject: string;
  banner: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface UserData {
  id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  emailAddress?: string;
  imageUrl?: string;
  displayName: string;
}

export default function MessagingPage({ 
  userId = "test-user-id", 
  recipientId,
  userRole = "tutee",
  offeringId
}: { 
  userId?: string;
  recipientId?: string; // ID of user to start conversation with (from /chat/[slug])
  userRole?: 'tutee' | 'tutor';
  offeringId?: string; // ID of the offering being discussed
}) {
  
  const [users, setUsers] = useState<User[]>([]);
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [allChats, setAllChats] = useState<Message[]>([]);
  const [search, setSearch] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [loading, setLoading] = useState(true);
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState<string>("");
  const [appointmentTime, setAppointmentTime] = useState<string>("08:00");
  const [appointmentMode, setAppointmentMode] = useState<'online' | 'in-person'>("online");
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLInputElement>(null);

  // Get upcoming accepted appointments from appointments collection
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);

  // Check if user has accepted appointments without quizzes (for tutors)
  const [appointmentsWithoutQuiz, setAppointmentsWithoutQuiz] = useState<any[]>([]);

  // Fetch appointment data for both upcoming appointments and missing quizzes
  useEffect(() => {
    if (!userId) return;

    const fetchAppointmentData = async () => {
      try {
        const result = await fetchAppointments(userId);
        if (result.success && result.appointments) {
          const now = new Date();
          
          // Filter for upcoming accepted appointments and completed appointments (so tutees can access quizzes)
          // Exclude completed appointments where tutee has finished both quizzes
          const upcoming = result.appointments.filter((apt: any) => {
            const isUpcoming = (apt.status === 'accepted' || apt.status === 'completed') && 
                              new Date(apt.datetimeISO) > now;
            
            if (!isUpcoming) return false;
            
            // If appointment is completed, check if both quizzes are done
            if (apt.status === 'completed') {
              const quizAttempts = apt.quizAttempts || [];
              const hasCompletedAttempt1 = quizAttempts.some((attempt: any) => attempt.attempt === 1);
              const hasCompletedAttempt2 = quizAttempts.some((attempt: any) => attempt.attempt === 2);
              
              // Don't show in reminders if both quizzes are completed
              if (hasCompletedAttempt1 && hasCompletedAttempt2) {
                return false;
              }
            }
            
            return true;
          }).sort((a: any, b: any) => 
            new Date(a.datetimeISO).getTime() - new Date(b.datetimeISO).getTime()
          );
          setUpcomingAppointments(upcoming);
          
          // Filter for accepted appointments where user is tutor and quiz is empty
          const appointmentsNeedingQuiz = result.appointments.filter((apt: any) => 
            apt.status === 'accepted' && 
            apt.tutorId === userId &&
            (!apt.quiz || apt.quiz.length === 0)
          );
          setAppointmentsWithoutQuiz(appointmentsNeedingQuiz);
        }
      } catch (error) {
        console.error('Error fetching appointment data:', error);
      }
    };

    fetchAppointmentData();
  }, [userId, messages]); // Re-run when messages change (appointments accepted/declined)

  // Handle real-time messages
  const handleRealtimeMessage = useCallback((newMessage: Message) => {
    console.log('Real-time message received:', newMessage);
    
    // Check if this message should be visible on current role page
    const shouldShowMessage = activeUser && newMessage.recipients.some(id => {
      // Handle ID format variations
      const userIdWithoutPrefix = userId!.startsWith('user_') ? userId!.replace('user_', '') : userId!;
      const userIdWithPrefix = userId!.startsWith('user_') ? userId! : `user_${userId!}`;
      const activeUserWithoutPrefix = activeUser.id.startsWith('user_') ? activeUser.id.replace('user_', '') : activeUser.id;
      const activeUserWithPrefix = activeUser.id.startsWith('user_') ? activeUser.id : `user_${activeUser.id}`;
      
      const userInRecipients = [userId, userIdWithoutPrefix, userIdWithPrefix].includes(id);
      const activeUserInRecipients = newMessage.recipients.some(recipId => 
        [activeUser.id, activeUserWithoutPrefix, activeUserWithPrefix].includes(recipId)
      );
      
      return userInRecipients && activeUserInRecipients;
    });

    if (shouldShowMessage) {
      // Add to messages if it's part of current conversation or update existing
      setMessages(prev => {
        const messageId = getMessageId(newMessage);
        const existingIndex = prev.findIndex(msg => getMessageId(msg) === messageId);
        
        if (existingIndex >= 0) {
          // Update existing message (for appointment status changes)
          console.log('Updating existing message in messages:', messageId, newMessage);
          const updated = [...prev];
          updated[existingIndex] = newMessage;
          return updated;
        } else {
          // Add new message
          return [...prev, newMessage].sort((a, b) => 
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        }
      });
    }

    // Always add to allChats for conversation list or update existing
    setAllChats(prev => {
      const messageId = getMessageId(newMessage);
      const existingIndex = prev.findIndex(msg => getMessageId(msg) === messageId);
      
      if (existingIndex >= 0) {
        // Update existing message
        const updated = [...prev];
        updated[existingIndex] = newMessage;
        return updated;
      } else {
        // Add new message
        return [newMessage, ...prev];
      }
    });
  }, [activeUser, userId]);

  // Set up Socket.IO connection for real-time messaging
  const { socket, isConnected, sendMessage: socketSendMessage } = useSocket(userId, userRole, handleRealtimeMessage);

  // Fetch chat data from MongoDB
  useEffect(() => {
    const loadChatsData = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const result = await fetchChats(userId, userRole);
        
        if (!result.success) {
          console.error('Chat API error:', result.error);
          setLoading(false);
          return;
        }
        
        const data = result.data;

        // Process existing chats if they exist
        let usersList: User[] = [];
        
        if (data.chats && data.chats.length > 0) {
          setAllChats(data.chats);
          
          // Process chats to create users list
          const userMap = new Map<string, User>();
          const allOtherUserIds = new Set<string>();
          
          data.chats.forEach((chat: Message) => {
            // Find other participants (excluding current user)
            // Handle both user ID formats for proper filtering
            const userIdWithoutPrefix = userId.startsWith('user_') ? userId.replace('user_', '') : userId;
            const userIdWithPrefix = userId.startsWith('user_') ? userId : `user_${userId}`;
            
            const otherUsers = chat.recipients.filter(id => 
              id !== userId && id !== userIdWithoutPrefix && id !== userIdWithPrefix
            );
            
            otherUsers.forEach(otherUserId => {
              // Normalize user ID to prevent duplicates
              const normalizedId = otherUserId.startsWith('user_') ? otherUserId : `user_${otherUserId}`;
              allOtherUserIds.add(otherUserId); // Keep original for API call
              
              if (!userMap.has(normalizedId)) {
                userMap.set(normalizedId, {
                  id: normalizedId,
                  name: `User ${otherUserId.slice(-4)}`, // Will be replaced with real name
                  lastMessage: chat.message,
                  unreadCount: 0, // TODO: Implement unread count logic
                  isTyping: false
                });
              } else {
                // Update last message if this chat is more recent
                const existingUser = userMap.get(normalizedId)!
                const existingLastMessageTime = new Date(existingUser.lastMessage);
                const currentMessageTime = new Date(chat.createdAt);
                
                if (currentMessageTime > existingLastMessageTime) {
                  existingUser.lastMessage = chat.message;
                }
              }
            });
          });

          // Fetch real user data
          if (allOtherUserIds.size > 0) {
            const userIdsArray = Array.from(allOtherUserIds);
            const userResult = await fetchUsers(userIdsArray);
            
            if (!userResult.success) {
              console.error('Users API error:', userResult.error);
            } else {
              const userData = userResult.data;
              
              if (userData.users) {
                // Update user map with real user data
                userData.users.forEach((user: UserData) => {
                  // Try to match user by normalized ID
                  const normalizedUserId = user.id.startsWith('user_') ? user.id : `user_${user.id}`;
                  
                  if (userMap.has(normalizedUserId)) {
                    const existingUser = userMap.get(normalizedUserId)!;
                    existingUser.name = user.displayName;
                    existingUser.firstName = user.firstName;
                    existingUser.lastName = user.lastName;
                    existingUser.username = user.username;
                    existingUser.emailAddress = user.emailAddress;
                    existingUser.imageUrl = user.imageUrl;
                  }
                });
              }
            }
          }

          usersList = Array.from(userMap.values());
        } else {
          setAllChats([]);
        }
        
        // Handle recipientId logic (works for both existing and new conversations)
        if (recipientId) {
          // Try to find recipient with exact ID match, or with/without user_ prefix
          let recipient = usersList.find(user => user.id === recipientId);
          if (!recipient && recipientId.startsWith('user_')) {
            const idWithoutPrefix = recipientId.replace('user_', '');
            recipient = usersList.find(user => user.id === idWithoutPrefix);
          }
          if (!recipient && !recipientId.startsWith('user_')) {
            const idWithPrefix = `user_${recipientId}`;
            recipient = usersList.find(user => user.id === idWithPrefix);
          }
          
          // Check if recipient exists and has real user data (not placeholder)
          if (recipient && !recipient.name.startsWith('User ') && recipient.name !== 'Loading user...') {
            setUsers(usersList);
            setActiveUser(recipient);
          } else {
            
            // Create a placeholder user for new conversation
            // Keep the recipientId format consistent with what's passed to the component
            const placeholderUser: User = {
              id: recipientId,
              name: `Loading user...`, // Will be updated with real name
              lastMessage: "",
              unreadCount: 0,
              isTyping: false
            };
            
            // Fetch real user data for this recipient
            try {
              // MongoDB users collection uses _id without user_ prefix
              const mongoUserId = recipientId.startsWith('user_') ? recipientId.replace('user_', '') : recipientId;
              const userResult = await fetchUsers([mongoUserId]);
              if (userResult.success) {
                const userData = userResult.data;
                if (userData.users && userData.users.length > 0) {
                  const realUser = userData.users[0];
                  const updatedUser = {
                    ...placeholderUser,
                    name: realUser.displayName,
                    firstName: realUser.firstName,
                    lastName: realUser.lastName,
                    username: realUser.username,
                    emailAddress: realUser.emailAddress,
                    imageUrl: realUser.imageUrl
                  };
                  setUsers([updatedUser, ...usersList]);
                  setActiveUser(updatedUser);
                } else {
                  // Update placeholder with a more descriptive name
                  const updatedPlaceholder = {
                    ...placeholderUser,
                    name: `Tutor (${recipientId.slice(-4)})`,
                    firstName: 'Unknown',
                    lastName: 'Tutor'
                  };
                  setUsers([updatedPlaceholder, ...usersList]);
                  setActiveUser(updatedPlaceholder);
                }
              } else {
                setUsers([placeholderUser, ...usersList]);
                setActiveUser(placeholderUser);
              }
            } catch (error) {
              setUsers([placeholderUser, ...usersList]);
              setActiveUser(placeholderUser);
            }
          }
        } else {
          // No recipientId provided, just set the users list and select first user if available
          setUsers(usersList);
          if (usersList.length > 0) {
            setActiveUser(usersList[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching chats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadChatsData();
  }, [userId, recipientId]);

  // Filter messages for active user
  useEffect(() => {
    if (activeUser && allChats.length > 0) {
      // Handle ID format variations for proper matching
      const userIdWithoutPrefix = userId!.startsWith('user_') ? userId!.replace('user_', '') : userId!;
      const userIdWithPrefix = userId!.startsWith('user_') ? userId! : `user_${userId!}`;
      const activeUserWithoutPrefix = activeUser.id.startsWith('user_') ? activeUser.id.replace('user_', '') : activeUser.id;
      const activeUserWithPrefix = activeUser.id.startsWith('user_') ? activeUser.id : `user_${activeUser.id}`;
      
      const conversationMessages = allChats.filter(chat => {
        const hasActiveUser = chat.recipients.some(id => 
          id === activeUser.id || id === activeUserWithoutPrefix || id === activeUserWithPrefix
        );
        const hasCurrentUser = chat.recipients.some(id => 
          id === userId || id === userIdWithoutPrefix || id === userIdWithPrefix
        );
        
        return hasActiveUser && hasCurrentUser;
      }).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      
      setMessages(conversationMessages);
    } else {
      setMessages([]);
    }
  }, [activeUser, allChats, userId]);

  // Fetch inquiry when activeUser changes OR when recipientId is available
  useEffect(() => {
    const fetchInquiry = async () => {
      // Determine who to check for inquiry with
      let otherUserId = null;
      
      if (activeUser) {
        otherUserId = activeUser.id;
      } else if (recipientId) {
        // If no activeUser but we have recipientId (new conversation), use that
        otherUserId = recipientId;
      }
      
      if (!otherUserId || !userId) {
        setInquiry(null);
        return;
      }

      try {
        // Determine who is tutee and who is tutor based on userRole
        const tuteeId = userRole === 'tutee' ? userId : otherUserId;
        const tutorId = userRole === 'tutor' ? userId : otherUserId;
        
        // If we have an offeringId, fetch inquiry by offering, otherwise by tutee/tutor
        let result;
        if (offeringId) {
          result = await getInquiryByOffering(tuteeId, tutorId, offeringId);
        } else {
          result = await getInquiry(tuteeId, tutorId);
        }
                
        if (result.success && result.data) {
          setInquiry(result.data);
        } else {
          setInquiry(null);
        }
      } catch (error) {
        console.error('Error fetching inquiry:', error);
        setInquiry(null);
      }
    };

    fetchInquiry();
  }, [activeUser, userId, userRole, recipientId, offeringId]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !activeUser || !userId) return;

    try {
      const messageData = {
        creatorId: userId,
        message: newMessage,
        recipients: [userId, activeUser.id],
        replyTo: replyTo,
        senderRole: userRole,
        type: 'text' as const
      };

      const result = await sendMessage(messageData);

      if (result.success) {
        // Real-time delivery is handled by the API route broadcasting to Socket.IO
        // The sender will receive their own message via Socket.IO broadcast to avoid double messages
        
        setNewMessage("");
        setReplyTo(null);

        // Update user's last message
        setUsers(prev => prev.map(user => 
          user.id === activeUser.id 
            ? { ...user, lastMessage: newMessage }
            : user
        ));
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Appointment helpers
  const openAppointmentModal = () => {
    setAppointmentDate("");
    setAppointmentTime("08:00");
    setAppointmentMode("online");
    setShowAppointmentModal(true);
  };

  const handleSendAppointment = async () => {
    if (!activeUser || !userId || !appointmentDate || !appointmentTime) return;
    const dt = new Date(`${appointmentDate}T${appointmentTime}`);
    const datetimeISO = dt.toISOString();

    try {
      // Create a descriptive message for the appointment
      const appointmentMessage = `Appointment request for ${dt.toLocaleDateString('en-US', { 
        weekday: 'long',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })} at ${dt.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })} (${appointmentMode})`;

      console.log('Creating appointment with data:', {
        subject: inquiry?.subject,
        offeringId: offeringId,
        inquiry: inquiry
      });

      const result = await sendMessage({
        creatorId: userId,
        message: appointmentMessage,
        recipients: [userId, activeUser.id],
        replyTo: null,
        senderRole: userRole,
        type: 'appointment',
        appointment: {
          datetimeISO,
          mode: appointmentMode,
          status: 'pending',
          subject: inquiry?.subject || 'Tutoring Session',
          offeringId: offeringId || undefined
        }
      });

      if (result.success) {
        const data = result.data;
        const newMsg: Message = {
          _id: data.message._id,
          creatorId: data.message.creatorId,
          message: data.message.message,
          createdAt: data.message.createdAt,
          replyTo: data.message.replyTo,
          recipients: data.message.recipients,
          senderRole: data.message.senderRole,
          type: data.message.type,
          appointment: data.message.appointment
        };

        // Real-time delivery is handled by the API route broadcasting to Socket.IO
        // The sender will receive their own message via Socket.IO broadcast to avoid double messages
        setShowAppointmentModal(false);
      }
    } catch {}
  };

  const handleAppointmentResponse = async (msg: Message, action: 'accepted' | 'declined' | 'cancelled') => {
    console.log('handleAppointmentResponse called:', { action, messageId: getMessageId(msg) });
    try {
      const messageId = getMessageId(msg);
      const result = await updateAppointmentStatus({ messageId, status: action, actorId: userId! });
      console.log('updateAppointmentStatus result:', result);
      
      if (result.success) {
        const updated: Message = result.data.message;
        console.log('Updated message from API:', updated);
        
        // Ensure the updated message has the correct structure for broadcast
        const broadcastMessage: Message = {
          _id: updated._id,
          creatorId: updated.creatorId,
          message: updated.message,
          createdAt: updated.createdAt,
          replyTo: updated.replyTo,
          recipients: updated.recipients,
          senderRole: updated.senderRole,
          type: updated.type,
          appointment: updated.appointment
        };
        
        console.log('Updated appointment message:', broadcastMessage);
        
        // Real-time updates are handled by the API route broadcasting to Socket.IO
        // The user will receive the updated message via Socket.IO broadcast to avoid double updates
      }
    } catch (error) {
      console.error('Error in handleAppointmentResponse:', error);
    }
  };

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="p-4 h-[92vh] max-h-[92vh] bg-gray-100 flex items-center justify-center w-full">
        <div className="text-center">
          <div className="text-green-700 mb-2">Loading conversations...</div>
        </div>
      </div>
    );
  }

  // Show empty state when no users/conversations exist
  if (!loading && users.length === 0) {
    return (
      <div className="p-4 h-[92vh] max-h-[92vh] bg-gray-100 flex items-center justify-center w-full">
        <div className="text-center max-w-md">
          <div className="mb-4">
            <InfoIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No conversations yet</h3>
          <p className="text-gray-500 mb-4">
            You haven't started any conversations. When you send or receive messages, they'll appear here.
          </p>
          <div className="text-sm text-gray-400">
            Start by browsing tutors and sending them a message!
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 h-[92vh] max-h-[92vh] bg-gray-100 grid grid-cols-1 md:grid-cols-4 xl:grid-cols-5 gap-4 w-full relative overflow-hidden">
      {/* Left Column */}
      <div className="bg-white rounded-2xl shadow p-4 flex flex-col col-span-1 overflow-y-auto">
        <div className="flex items-center gap-2 mb-4">
          <Search className="w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm"
          />
        </div>
        <div className="overflow-y-auto space-y-2">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              onClick={() => setActiveUser(user)}
              className={`p-3 rounded-xl cursor-pointer transition ${
                activeUser?.id === user.id
                  ? "bg-green-50 border border-green-200"
                  : "hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {user.imageUrl ? (
                    <img 
                      src={user.imageUrl} 
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-green-700 font-semibold text-sm">
                      {user.firstName?.charAt(0) || user.name.charAt(0)}
                      {user.lastName?.charAt(0) || ''}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold text-sm text-green-900 truncate">
                      {user.name}
                    </h4>
                    {user.unreadCount > 0 && (
                      <span className="bg-green-700 text-white text-xs px-2 py-0.5 rounded-full flex-shrink-0">
                        {user.unreadCount}
                      </span>
                    )}
                  </div>
                  {user.username && (
                    <p className="text-xs text-gray-400 truncate">@{user.username}</p>
                  )}
                </div>
              </div>
              {user.isTyping ? (
                <p className="text-xs text-green-600 mt-1 animate-pulse flex flex-row">
                  Typing
                  <div className="animate-bounce [animation-delay:0ms] [animation-iteration-count:infinite] [animation-timing-function:ease-in-out] [animation-name:bounce15]">
                    .
                  </div>
                  <div className="animate-bounce [animation-delay:75ms] [animation-iteration-count:infinite] [animation-timing-function:ease-in-out] [animation-name:bounce15]">
                    .
                  </div>
                  <div className="animate-bounce [animation-delay:150ms] [animation-iteration-count:infinite] [animation-timing-function:ease-in-out] [animation-name:bounce15]">
                    .
                  </div>
                  <style jsx global>{`
                    @keyframes bounce15 {
                      0%,
                      100% {
                        transform: translateY(0);
                      }
                      50% {
                        transform: translateY(-15%);
                      }
                    }
                  `}</style>
                </p>
              ) : (
                <p className="text-xs text-gray-500 truncate">
                  {user.lastMessage}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Middle Column - Chat */}
      <div className="bg-white rounded-2xl shadow flex flex-col overflow-hidden col-span-1 md:col-span-3">
  <div className="p-4 border-b border-black/30 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {activeUser && (
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                {activeUser.imageUrl ? (
                  <img 
                    src={activeUser.imageUrl} 
                    alt={activeUser.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-green-700 font-semibold text-xs">
                    {activeUser.firstName?.charAt(0) || activeUser.name.charAt(0)}
                    {activeUser.lastName?.charAt(0) || ''}
                  </span>
                )}
              </div>
            )}
            <div>
              <h3 className="font-semibold text-green-900 text-sm">
                {activeUser?.name ?? "Select a user"}
              </h3>
              {activeUser?.username && (
                <p className="text-xs text-gray-500">@{activeUser.username}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Tutor-only appointment button */}
            {userRole === 'tutor' && activeUser && (
              <button
                onClick={openAppointmentModal}
                title="Schedule appointment"
                className="p-2 text-green-700 hover:bg-green-100 rounded-full"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </button>
            )}
            <button
              onClick={() => setShowSidebar(true)}
              className="xl:hidden p-2 text-green-700 hover:bg-green-100 rounded-full"
            >
              <Info className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-3"
        >
          {!activeUser ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="mb-4">
                  <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                </div>
                <h4 className="text-lg font-semibold text-gray-600 mb-2">
                  Select a conversation
                </h4>
                <p className="text-gray-400 text-sm">
                  Choose a conversation from the list to start messaging.
                </p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="mb-4">
                  <Send className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                </div>
                <h4 className="text-lg font-semibold text-gray-600 mb-2">
                  Start a conversation
                </h4>
                <p className="text-gray-400 text-sm mb-4">
                  Send a message to {activeUser.name} to begin your conversation.
                </p>
                <div className="text-xs text-gray-300">
                  Type your message below and press Enter
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
            <div
              className={`flex gap-2 w-full group ${msg.creatorId === userId ? "flex-row-reverse ml-auto" : "flex-row"}`}
              key={getMessageId(msg)}
            >
              <div
                className={`max-w-9/12 p-3 rounded-2xl relative z-0 ${
                  msg.creatorId === userId
                    ? "bg-green-700 text-white"
                    : "bg-green-50 text-green-900"
                }`}
              >
                {msg.replyTo && (
                  <div
                    className={`text-xs mb-1 p-2 rounded-md ${
                      msg.creatorId === userId ? "bg-green-800/40" : "bg-green-100"
                    }`}
                  >
                    <CornerDownRight className="inline w-3 h-3 mr-1" />
                    <span className="italic">
                      {messages.find((m) => getMessageId(m) === msg.replyTo)?.message ??
                        "Message not found"}
                    </span>
                  </div>
                )}
                {msg.type === 'appointment' && msg.appointment ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 font-semibold">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/20">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                          <line x1="16" y1="2" x2="16" y2="6"></line>
                          <line x1="8" y1="2" x2="8" y2="6"></line>
                          <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                      </span>
                      <span>Appointment</span>
                      <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                        msg.appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        msg.appointment.status === 'accepted' ? 'bg-green-100 text-green-800' :
                        msg.appointment.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {msg.appointment.status}
                      </span>
                    </div>
                    <div className="text-sm">
                      {msg.appointment.subject && (
                        <div>Subject: <span className="font-medium">{msg.appointment.subject}</span></div>
                      )}
                      <div>Date & Time: <span className="font-medium">{new Date(msg.appointment.datetimeISO).toLocaleString()}</span></div>
                      <div>Mode: <span className="font-medium capitalize">{msg.appointment.mode}</span></div>
                    </div>
                    {userRole === 'tutee' && msg.appointment.status === 'pending' && (
                      <div className="flex gap-2 mt-2 pointer-events-auto relative z-10">
                        <button type="button" onClick={() => handleAppointmentResponse(msg, 'accepted')} className="px-3 py-1 rounded-md bg-white/90 text-green-800 hover:bg-white cursor-pointer">Accept</button>
                        <button type="button" onClick={() => handleAppointmentResponse(msg, 'declined')} className="px-3 py-1 rounded-md bg-white/20 text-current hover:bg-white/30 cursor-pointer">Decline</button>
                      </div>
                    )}
                    {userRole === 'tutor' && msg.appointment.status === 'pending' && msg.creatorId === userId && (
                      <div className="flex gap-2 mt-2 pointer-events-auto relative z-10">
                        <button type="button" onClick={() => handleAppointmentResponse(msg, 'cancelled')} className="px-3 py-1 rounded-md bg-white/20 text-current hover:bg-white/30 cursor-pointer">Cancel</button>
                      </div>
                    )}
                  </div>
                ) : msg.type === 'quiz-result' && msg.quizResult ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 font-semibold">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/20">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                          <circle cx="12" cy="12" r="10"></circle>
                          <path d="m9 12 2 2 4-4"></path>
                        </svg>
                      </span>
                      <span>Quiz Completed</span>
                      <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                        msg.quizResult.score >= 70 ? 'bg-green-100 text-green-800' : 
                        msg.quizResult.score >= 50 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {msg.quizResult.score}%
                      </span>
                    </div>
                    <div className="text-sm">
                      <div>Quiz Type: <span className="font-medium">{msg.quizResult.attempt === 1 ? 'Pre-Session' : 'Post-Session'}</span></div>
                      <div>Score: <span className="font-medium">{msg.quizResult.score}% ({Math.round((msg.quizResult.score / 100) * msg.quizResult.totalQuestions)}/{msg.quizResult.totalQuestions} correct)</span></div>
                      <div>Completed: <span className="font-medium">{new Date(msg.quizResult.completedAt).toLocaleString()}</span></div>
                    </div>
                    <div className="flex gap-2 mt-2 pointer-events-auto relative z-10">
                      <button 
                        type="button" 
                        onClick={() => {
                          if (msg.quizResult) {
                            window.location.href = `/quiz?appointmentId=${msg.quizResult.appointmentId}&attempt=${msg.quizResult.attempt}`;
                          }
                        }}
                        className="px-3 py-1 rounded-md bg-white/90 text-green-800 hover:bg-white cursor-pointer font-medium"
                      >
                        View Quiz Results
                      </button>
                    </div>
                  </div>
                ) : (
                  <p>{msg.message}</p>
                )}
                <span className="block text-[10px] mt-1 opacity-70">
                  {formatTimestamp(msg.createdAt)}
                </span>
              </div>
              <button
                onClick={() => {
                  setReplyTo(getMessageId(msg));
                  chatRef.current?.focus();
                }}
                className="hidden text-sm mt-1 text-green-800 hover:underline select-none hover:cursor-pointer group-hover:block lg:hidden"
              >
                <CornerUpLeft className="inline w-4 h-4 mr-1 stroke-3" />
              </button>
            </div>
            ))
          )}
        </div>

        {replyTo && (
          <div className="p-2 bg-green-50 border-t text-xs flex items-center justify-between">
            <span>
              Replying to:{" "}
              <span className="font-semibold">
                {messages.find((m) => getMessageId(m) === replyTo)?.message ??
                  "Message not found"}
              </span>
            </span>
            <button
              onClick={() => setReplyTo(null)}
              className="text-green-700 font-semibold hover:cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {activeUser && activeUser.isTyping && (
                <p className="text-xs text-green-800 mt-1 flex flex-row gap-1 p-2">
                  {activeUser.name} is typing
                  <div className="animate-bounce [animation-delay:0ms] [animation-iteration-count:infinite] [animation-timing-function:ease-in-out] [animation-name:bounce15]">
                    .
                  </div>
                  <div className="animate-bounce [animation-delay:75ms] [animation-iteration-count:infinite] [animation-timing-function:ease-in-out] [animation-name:bounce15]">
                    .
                  </div>
                  <div className="animate-bounce [animation-delay:150ms] [animation-iteration-count:infinite] [animation-timing-function:ease-in-out] [animation-name:bounce15]">
                    .
                  </div>
                  <style jsx global>{`
                    @keyframes bounce15 {
                      0%,
                      100% {
                        transform: translateY(0);
                      }
                      50% {
                        transform: translateY(-15%);
                      }
                    }
                  `}</style>
                </p>
              )}

        <div className="p-3 border-t border-black/30 flex items-center gap-2">
          <input
            type="text"
            placeholder={activeUser ? "Aa" : "Select a conversation to start messaging"}
            value={newMessage}
            ref={chatRef}
            disabled={!activeUser}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className={`flex-1 rounded-full px-3 py-2 text-sm outline-none transition ${
              activeUser 
                ? "bg-green-50 focus:ring-2 focus:ring-green-700" 
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          />
          <button
            onClick={handleSend}
            disabled={!activeUser}
            className={`p-2 rounded-full flex items-center justify-center transition ${
              activeUser 
                ? "bg-green-700 hover:bg-green-800 text-white" 
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Appointment Modal */}
      {showAppointmentModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-green-900 mb-4">Schedule Appointment</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Date</label>
                  <input type="date" value={appointmentDate} onChange={(e) => setAppointmentDate(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Time</label>
                  <select value={appointmentTime} onChange={(e) => setAppointmentTime(e.target.value)} className="w-full border rounded-lg px-3 py-2">
                    {Array.from({ length: 288 }, (_, i) => {
                      const totalMinutes = i * 5;
                      const hours = Math.floor(totalMinutes / 60);
                      const minutes = totalMinutes % 60;
                      const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                      return (
                        <option key={timeString} value={timeString}>
                          {timeString}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Mode</label>
                <select value={appointmentMode} onChange={(e) => setAppointmentMode(e.target.value as 'online' | 'in-person')} className="w-full border rounded-lg px-3 py-2">
                  <option value="online">Online</option>
                  <option value="in-person">In-person</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowAppointmentModal(false)} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700">Cancel</button>
              <button onClick={handleSendAppointment} className="px-4 py-2 rounded-lg bg-green-700 text-white">Send</button>
            </div>
          </div>
        </div>
      )}

      {/* Right Column (Desktop only) */}
      <div className="bg-white rounded-2xl shadow p-4 space-y-4 col-span-1 hidden xl:block">
        <div>
          <h4 className="font-semibold text-green-900 text-sm mb-3">
            User Information
          </h4>
          {activeUser ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {activeUser.imageUrl ? (
                    <img 
                      src={activeUser.imageUrl} 
                      alt={activeUser.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-green-700 font-semibold">
                      {activeUser.firstName?.charAt(0) || activeUser.name.charAt(0)}
                      {activeUser.lastName?.charAt(0) || ''}
                    </span>
                  )}
                </div>
                <div>
                  <h5 className="font-medium text-gray-900">{activeUser.name}</h5>
                  {activeUser.username && (
                    <p className="text-xs text-gray-500">@{activeUser.username}</p>
                  )}
                </div>
              </div>
              {/* {activeUser.emailAddress && (
                <p className="text-sm text-gray-600">
                  Email: <span className="font-medium text-gray-800">{activeUser.emailAddress}</span>
                </p>
              )} */}
              {activeUser.firstName && activeUser.lastName && (
                <p className="text-sm text-gray-600">
                  Name: <span className="font-medium text-gray-800">{activeUser.firstName} {activeUser.lastName}</span>
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Select a conversation to view user information</p>
          )}
        </div>
        <div>
          <h4 className="font-semibold text-green-900 text-sm mb-2">Inquiry</h4>
          {inquiry ? (
            <div className="w-full bg-white rounded-xl shadow-lg transition-transform flex flex-col">
              <div className="relative">
                <img
                  src={inquiry.banner}
                  alt={inquiry.subject}
                  className="w-full h-24 object-cover rounded-t-xl"
                />
              </div>
              <div className="flex flex-col gap-2 p-4">
                <h2 className="font-bold text-lg text-green-900">{inquiry.subject}</h2>
                <div 
                  className="text-xs text-gray-600 line-clamp-2"
                  dangerouslySetInnerHTML={{ __html: inquiry.description }}
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">
                    Created: {new Date(inquiry.createdAt).toLocaleDateString()}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    inquiry.status === 'active' ? 'bg-green-100 text-green-700' :
                    inquiry.status === 'resolved' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {inquiry.status}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-500">No inquiry information available</p>
            </div>
          )}
        </div>
        <div>
          <h4 className="font-semibold text-green-900 text-sm mb-2">
            Reminders
          </h4>
          <ul className="text-sm space-y-1 *:bg-green-700 text-white/95 *:px-3 *:py-4 *:rounded-md overflow-y-auto max-h-[34rem] rounded-md">
            {appointmentsWithoutQuiz.length > 0 && (
              <li>
                <div className="flex flex-col gap-1">
                  <h1 className="font-bold flex flex-row items-center gap-2">
                    <InfoIcon className="inline-block size-6" /> Quiz needed for appointments
                  </h1>
                  <p className="text-xs">
                    You have {appointmentsWithoutQuiz.length} accepted appointment{appointmentsWithoutQuiz.length === 1 ? '' : 's'} without quiz{appointmentsWithoutQuiz.length === 1 ? '' : 'zes'}.
                  </p>
                  <button 
                    onClick={() => {
                      // Navigate to quiz editor with the first appointment that needs a quiz
                      if (appointmentsWithoutQuiz.length > 0) {
                        const appointment = appointmentsWithoutQuiz[0];
                        window.location.href = `/tutor/quiz/edit?appointmentId=${appointment.messageId}`;
                      }
                    }}
                    className="font-semibold py-2 mt-2 bg-white text-black hover:bg-white/80 hover:cursor-pointer transition-all rounded-lg"
                  >
                    Create Quiz
                  </button>
                </div>
              </li>
            )}
            {upcomingAppointments.slice(0, 1).map((apt: any, index: number) => {
              const appointmentDate = new Date(apt.datetimeISO);
              const isToday = appointmentDate.toDateString() === new Date().toDateString();
              const isTomorrow = appointmentDate.toDateString() === new Date(Date.now() + 24 * 60 * 60 * 1000).toDateString();
              
              let dateText = appointmentDate.toLocaleDateString();
              if (isToday) dateText = "today";
              else if (isTomorrow) dateText = "tomorrow";
              
              const timeText = appointmentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              
              // Check if quiz is available
              const hasQuiz = apt.quiz && apt.quiz.length > 0;
              const isTutor = userId && apt.tutorId === userId;
              const isTutee = userId && apt.tuteeId === userId;
              
              // Check if user has completed specific quiz attempts
              const quizAttempts = apt.quizAttempts || [];
              const hasCompletedAttempt1 = quizAttempts.some((attempt: any) => attempt.attempt === 1 && attempt.tuteeId === userId);
              const hasCompletedAttempt2 = quizAttempts.some((attempt: any) => attempt.attempt === 2 && attempt.tuteeId === userId);
              
              return (
                <li key={apt._id || `apt-${index}`}>
                  <div className="flex flex-col gap-1">
                    <h1 className="font-bold flex flex-row items-center gap-2">
                      <InfoIcon className="inline-block size-6" /> Upcoming Appointment
                    </h1>
                    <p className="text-xs">
                      You have an appointment scheduled for {dateText} at {timeText} ({apt.mode}).
                    </p>
                    
                    {/* Quiz completion status indicators for tutees */}
                    {hasQuiz && isTutee && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        <div className={`text-xs px-2 py-1 rounded-full font-medium ${
                          hasCompletedAttempt1 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {hasCompletedAttempt1 ? '✓' : '○'} Pre-Session Quiz
                        </div>
                        {apt.status === 'completed' && (
                          <div className={`text-xs px-2 py-1 rounded-full font-medium ${
                            hasCompletedAttempt2 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-orange-100 text-orange-700'
                          }`}>
                            {hasCompletedAttempt2 ? '✓' : '○'} Post-Session Quiz
                          </div>
                        )}
                      </div>
                    )}
                    
                    {!hasQuiz && (
                      <p className="text-xs text-red-600 mt-1 bg-white/95 font-bold rounded px-3 py-2">
                        {isTutor && "⚠️ Quiz required before meeting can start"}
                        {isTutee && "⚠️ Waiting for tutor to create quiz"}
                      </p>
                    )}
                    
                    <div className="space-y-2 mt-2">
                      {/* Primary Action Button */}
                      <button 
                        disabled={(!hasQuiz && !isTutor) || (hasQuiz && isTutor && apt.status === 'completed')}
                        onClick={() => {
                          if (hasQuiz && isTutee) {
                            // Navigate to tutee quiz
                            window.location.href = `/quiz?appointmentId=${apt.messageId}&attempt=1`;
                          } else if (hasQuiz && isTutor && apt.status !== 'completed') {
                            // Handle meeting entry or details view
                            console.log('Enter meeting or view details');
                          } else if (isTutor) {
                            // Navigate to quiz editor
                            window.location.href = `/tutor/quiz/edit?appointmentId=${apt.messageId}`;
                          }
                        }}
                        className={`w-full font-semibold py-2 rounded-lg transition-all ${
                          hasQuiz 
                            ? (isTutor && apt.status === 'completed')
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : (isTutee && hasCompletedAttempt1)
                                ? 'bg-green-600 text-white hover:bg-green-700 hover:cursor-pointer'
                                : 'bg-white text-black hover:bg-white/80 hover:cursor-pointer'
                            : isTutor 
                              ? 'bg-green-600 text-white hover:bg-green-700 hover:cursor-pointer'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {hasQuiz ? (
                          isTutee 
                            ? hasCompletedAttempt1 
                              ? 'View Pre-Session Quiz'
                              : (apt.status === 'completed' ? 'Retake Pre-Session Quiz' : 'Take Pre-Session Quiz')
                            : (apt.status === 'completed' ? 'Session Completed' : (apt.mode === 'online' ? 'Enter Meeting' : 'View Details'))
                        ) : (
                          isTutor ? 'Create Quiz to Enable Meeting' : 'Remind Tutor to Make Quiz'
                        )}
                      </button>

                      {/* Secondary Actions for Tutees */}
                      {hasQuiz && isTutee && apt.status === 'completed' && (
                        <button 
                          onClick={() => {
                            window.location.href = `/quiz?appointmentId=${apt.messageId}&attempt=2`;
                          }}
                          className={`w-full font-semibold py-2 rounded-lg transition-all ${
                            hasCompletedAttempt2
                              ? 'bg-green-600 text-white hover:bg-green-700'
                              : 'bg-purple-600 text-white hover:bg-purple-700'
                          }`}
                        >
                          {hasCompletedAttempt2 ? 'View Post-Session Quiz' : 'Take Post-Session Quiz'}
                        </button>
                      )}

                      {/* Tutor Controls */}
                      {hasQuiz && isTutor && apt.status !== 'completed' && (
                        <button 
                          onClick={async () => {
                            try {
                              const result = await updateAppointmentCollectionStatus({
                                messageId: apt.messageId,
                                status: 'completed',
                                userId: userId
                              });

                              if (result.success) {
                                // Refresh the appointments - need to reload the page or trigger a re-fetch
                                window.location.reload();
                              } else {
                                console.error('Failed to mark appointment as completed:', result.error);
                              }
                            } catch (error) {
                              console.error('Error marking appointment as done:', error);
                            }
                          }}
                          className="w-full font-semibold py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all"
                        >
                          Mark Session as Completed
                        </button>
                      )}

                      {hasQuiz && isTutor && apt.status === 'completed' && (
                        <div className="text-xs text-green-600 bg-green-50 rounded px-2 py-1 text-center font-medium">
                          ✓ Session completed - Tutee can now take post-quiz
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Slide-out Drawer for Mobile & Tablet */}
      {showSidebar && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-end">
          <div className="bg-white w-80 h-full p-6 shadow-lg rounded-l-2xl space-y-4 animate-slideInRight overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <h4 className="font-semibold text-green-900">User Info</h4>
              <button
                onClick={() => setShowSidebar(false)}
                className="text-gray-500 hover:text-green-700"
              >
                ✕
              </button>
            </div>
            <div>
              {activeUser ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {activeUser.imageUrl ? (
                        <img 
                          src={activeUser.imageUrl} 
                          alt={activeUser.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-green-700 font-semibold">
                          {activeUser.firstName?.charAt(0) || activeUser.name.charAt(0)}
                          {activeUser.lastName?.charAt(0) || ''}
                        </span>
                      )}
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-900">{activeUser.name}</h5>
                      {activeUser.username && (
                        <p className="text-xs text-gray-500">@{activeUser.username}</p>
                      )}
                    </div>
                  </div>
                  {/* {activeUser.emailAddress && (
                    <p className="text-sm text-gray-600">
                      Email: <span className="font-medium text-gray-800">{activeUser.emailAddress}</span>
                    </p>
                  )} */}
                  {activeUser.firstName && activeUser.lastName && (
                    <p className="text-sm text-gray-600">
                      Name: <span className="font-medium text-gray-800">{activeUser.firstName} {activeUser.lastName}</span>
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No user selected</p>
              )}
            </div>
            <div>
              <h4 className="font-semibold text-green-900 text-sm mb-2">Inquiry</h4>
              {inquiry ? (
                <div className="w-full bg-white rounded-xl shadow-lg transition-transform flex flex-col mb-4">
                  <div className="relative">
                    <img
                      src={inquiry.banner}
                      alt={inquiry.subject}
                      className="w-full h-20 object-cover rounded-t-xl"
                    />
                  </div>
                  <div className="flex flex-col gap-2 p-3">
                    <h2 className="font-bold text-sm text-green-900">{inquiry.subject}</h2>
                    <div 
                      className="text-xs text-gray-600 line-clamp-2"
                      dangerouslySetInnerHTML={{ __html: inquiry.description }}
                    />
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500">
                        Created: {new Date(inquiry.createdAt).toLocaleDateString()}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        inquiry.status === 'active' ? 'bg-green-100 text-green-700' :
                        inquiry.status === 'resolved' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {inquiry.status}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full bg-gray-50 rounded-xl p-3 text-center mb-4">
                  <p className="text-xs text-gray-500">No inquiry information available</p>
                </div>
              )}
            </div>
            <div>
              <h4 className="font-semibold text-green-900 text-sm mb-2">
                Reminders
              </h4>
              <ul className="text-sm space-y-1 *:bg-green-700 text-white/95 *:px-3 *:py-4 *:rounded-md overflow-y-auto max-h-[20rem] rounded-md">
                {appointmentsWithoutQuiz.length > 0 && (
                  <li>
                    <div className="flex flex-col gap-1">
                      <h1 className="font-bold flex flex-row items-center gap-2">
                        <InfoIcon className="inline-block size-6" /> Quiz needed for appointments
                      </h1>
                      <p className="text-xs">
                        You have {appointmentsWithoutQuiz.length} accepted appointment{appointmentsWithoutQuiz.length === 1 ? '' : 's'} without quiz{appointmentsWithoutQuiz.length === 1 ? '' : 'zes'}.
                      </p>
                      <button 
                        onClick={() => {
                          // Navigate to quiz editor with the first appointment that needs a quiz
                          if (appointmentsWithoutQuiz.length > 0) {
                            const appointment = appointmentsWithoutQuiz[0];
                            window.location.href = `/tutor/quiz/edit?appointmentId=${appointment.messageId}`;
                          }
                        }}
                        className="font-semibold py-2 mt-2 bg-white text-black hover:bg-white/80 hover:cursor-pointer transition-all rounded-lg"
                      >
                        Create Quiz
                      </button>
                    </div>
                  </li>
                )}
                {upcomingAppointments.slice(0, 2).map((apt: any, index: number) => {
                  const appointmentDate = new Date(apt.datetimeISO);
                  const isToday = appointmentDate.toDateString() === new Date().toDateString();
                  const isTomorrow = appointmentDate.toDateString() === new Date(Date.now() + 24 * 60 * 60 * 1000).toDateString();
                  
                  let dateText = appointmentDate.toLocaleDateString();
                  if (isToday) dateText = "today";
                  else if (isTomorrow) dateText = "tomorrow";
                  
                  const timeText = appointmentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  
                  // Check if quiz is available
                  const hasQuiz = apt.quiz && apt.quiz.length > 0;
                  const isTutor = userId && apt.tutorId === userId;
                  const isTutee = userId && apt.tuteeId === userId;
                  
                  // Check if user has completed specific quiz attempts
                  const quizAttempts = apt.quizAttempts || [];
                  const hasCompletedAttempt1 = quizAttempts.some((attempt: any) => attempt.attempt === 1 && attempt.tuteeId === userId);
                  const hasCompletedAttempt2 = quizAttempts.some((attempt: any) => attempt.attempt === 2 && attempt.tuteeId === userId);
                  
                  return (
                    <li key={apt._id || `apt-${index}`}>
                      <div className="flex flex-col gap-1">
                        <h1 className="font-bold flex flex-row items-center gap-2">
                          <InfoIcon className="inline-block size-6" /> Upcoming Appointment
                        </h1>
                        <p className="text-xs">
                          You have an appointment scheduled for {dateText} at {timeText} ({apt.mode}).
                        </p>
                        
                        {/* Quiz completion status indicators for tutees */}
                        {hasQuiz && isTutee && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            <div className={`text-xs px-2 py-1 rounded-full font-medium ${
                              hasCompletedAttempt1 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {hasCompletedAttempt1 ? '✓' : '○'} Pre-Session Quiz
                            </div>
                            {apt.status === 'completed' && (
                              <div className={`text-xs px-2 py-1 rounded-full font-medium ${
                                hasCompletedAttempt2 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-orange-100 text-orange-700'
                              }`}>
                                {hasCompletedAttempt2 ? '✓' : '○'} Post-Session Quiz
                              </div>
                            )}
                          </div>
                        )}
                        
                        {!hasQuiz && (
                          <p className="text-xs text-red-600 mt-1 bg-white/95 font-bold rounded px-3 py-2">
                            {isTutor && "⚠️ Quiz required before meeting can start"}
                            {isTutee && "⚠️ Waiting for tutor to create quiz"}
                          </p>
                        )}
                        
                        <div className="space-y-2 mt-2">
                          {/* Tutor Actions Only */}
                          {isTutor && !hasQuiz && (
                            <button 
                              onClick={() => {
                                window.location.href = `/tutor/quiz/edit?appointmentId=${apt.messageId}`;
                              }}
                              className="w-full font-semibold py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-all"
                            >
                              Create Quiz to Enable Meeting
                            </button>
                          )}

                          {hasQuiz && isTutor && apt.status !== 'completed' && (
                            <button 
                              onClick={() => {
                                // Handle meeting entry or details view
                                console.log('Enter meeting or view details');
                              }}
                              className="w-full font-semibold py-2 rounded-lg bg-white text-black hover:bg-white/80 transition-all"
                            >
                              {apt.mode === 'online' ? 'Enter Meeting' : 'View Details'}
                            </button>
                          )}

                          {/* Tutor Session Completion Controls */}
                          {hasQuiz && isTutor && apt.status !== 'completed' && (
                            <button 
                              onClick={async () => {
                                try {
                                  const result = await updateAppointmentCollectionStatus({
                                    messageId: apt.messageId,
                                    status: 'completed',
                                    userId: userId
                                  });

                                  if (result.success) {
                                    // Refresh the appointments - need to reload the page or trigger a re-fetch
                                    window.location.reload();
                                  } else {
                                    console.error('Failed to mark appointment as completed:', result.error);
                                  }
                                } catch (error) {
                                  console.error('Error marking appointment as done:', error);
                                }
                              }}
                              className="w-full font-semibold py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all"
                            >
                              Mark Session as Completed
                            </button>
                          )}

                          {hasQuiz && isTutor && apt.status === 'completed' && (
                            <div className="text-xs text-green-600 bg-green-50 rounded px-2 py-1 text-center font-medium">
                              ✓ Session completed - Tutee can now take post-quiz
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              {upcomingAppointments.length === 0 && appointmentsWithoutQuiz.length === 0 && (
                <p className="text-sm text-gray-500">No upcoming appointments</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}