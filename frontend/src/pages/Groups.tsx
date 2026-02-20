import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Plus, Settings, Trash2, UserPlus, Crown, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'

interface GroupMember {
  _id: string
  userId: string
  email: string
  name: string
  role: 'leader' | 'member'
  joinedAt: string
  status: 'active' | 'inactive'
}

interface SigningGroup {
  _id: string
  name: string
  description?: string
  owner: {
    _id: string
    name: string
    email: string
  }
  members: GroupMember[]
  isPublic: boolean
  inviteCode?: string
  createdAt: string
  updatedAt: string
}

export default function Groups() {
  // Check authentication on component mount
  useState(() => {
    const token = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    console.log('Auth check - Token exists:', !!token, 'Refresh token exists:', !!refreshToken);
    
    if (!token) {
      console.log('No access token found, redirecting to login...');
      window.location.href = '/login';
      return;
    }
  })

  const [search, setSearch] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showAddMemberForm, setShowAddMemberForm] = useState(false)
  const [showSigningRequestForm, setShowSigningRequestForm] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<SigningGroup | null>(null)
  const [newGroup, setNewGroup] = useState({ name: '', description: '', isPublic: false })
  const [newMember, setNewMember] = useState({ email: '', name: '', role: 'member' as 'leader' | 'member' })
  const [signingRequest, setSigningRequest] = useState({
    documentId: '',
    message: '',
    subject: '',
    signingOrder: 'parallel' as 'parallel' | 'sequential',
    expiresInDays: 7
  })
  const queryClient = useQueryClient()

  // Test API call on component mount
  useState(() => {
    console.log('Groups component mounted - testing API...')
    api.getDocuments().then(response => {
      console.log('Direct API call result:', response)
    }).catch(error => {
      console.error('Direct API call error:', error)
    })
  })

  const { data: groups, isLoading } = useQuery({
    queryKey: ['groups', search],
    queryFn: () => api.getGroups({ search }),
    select: (response) => response.data
  })

  const { data: documents = [], error: documentsError, isLoading: documentsLoading, refetch: refetchDocuments } = useQuery({
    queryKey: ['documents', { search: '', status: '', page: 1 }],
    queryFn: () => api.getDocuments({ search: '', status: '', page: 1, limit: 10 }),
    select: (response) => {
      console.log('Documents API response in Groups:', response);
      // Documents page expects response.data, so let's try that first
      if (response?.data) {
        const docs = Array.isArray(response.data) ? response.data : response.data?.data || [];
        console.log('Parsed documents:', docs);
        return docs;
      }
      return [];
    }
  })

  const createGroupMutation = useMutation({
    mutationFn: (data: typeof newGroup) => api.createSigningGroup(data),
    onSuccess: () => {
      toast.success('Group created successfully')
      setShowCreateForm(false)
      setNewGroup({ name: '', description: '', isPublic: false })
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create group')
    }
  })

  const addMemberMutation = useMutation({
    mutationFn: ({ groupId, data }: { groupId: string; data: typeof newMember }) => 
      api.addGroupMember(groupId, data),
    onSuccess: () => {
      toast.success('Member added successfully')
      setShowAddMemberForm(false)
      setNewMember({ email: '', name: '', role: 'member' })
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to add member')
    }
  })

  const removeMemberMutation = useMutation({
    mutationFn: ({ groupId, memberId }: { groupId: string; memberId: string }) => 
      api.removeGroupMember(groupId, memberId),
    onSuccess: () => {
      toast.success('Member removed successfully')
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to remove member')
    }
  })

  const createSigningRequestMutation = useMutation({
    mutationFn: ({ groupId, data }: { groupId: string; data: typeof signingRequest }) => 
      api.createGroupSigningRequest(groupId, data),
    onSuccess: () => {
      toast.success('Signing request created successfully')
      setShowSigningRequestForm(false)
      setSigningRequest({
        documentId: '',
        message: '',
        subject: '',
        signingOrder: 'parallel',
        expiresInDays: 7
      })
      setSelectedGroup(null)
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create signing request')
    }
  })

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGroup.name.trim()) {
      toast.error('Group name is required')
      return
    }
    createGroupMutation.mutate(newGroup)
  }

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMember.email || !newMember.name) {
      toast.error('Email and name are required')
      return
    }
    if (!selectedGroup) {
      toast.error('Please select a group')
      return
    }
    addMemberMutation.mutate({ 
      groupId: selectedGroup._id, 
      data: {
        ...newMember,
        role: newMember.role as 'leader' | 'member'
      }
    })
  }

  const handleRemoveMember = (groupId: string, memberId: string) => {
    if (window.confirm('Are you sure you want to remove this member?')) {
      removeMemberMutation.mutate({ groupId, memberId })
    }
  }

  const handleCreateSigningRequest = (e: React.FormEvent) => {
    e.preventDefault()
    if (!signingRequest.documentId) {
      toast.error('Please select a document')
      return
    }
    if (!selectedGroup) {
      toast.error('Please select a group')
      return
    }
    createSigningRequestMutation.mutate({ 
      groupId: selectedGroup._id, 
      data: signingRequest 
    })
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Signing Groups</h1>
        <div className="flex gap-2">
          <button
            onClick={() => {
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              window.location.href = '/login';
            }}
            className="px-3 py-1 border border-red-600 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
          >
            🔓 Reset Auth
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Group
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search groups..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Create Group Form */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Group</h2>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                <input
                  type="text"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter group name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newGroup.description}
                  onChange={(e) => setNewGroup(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Optional description"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={newGroup.isPublic}
                  onChange={(e) => setNewGroup(prev => ({ ...prev, isPublic: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isPublic" className="ml-2 text-sm text-gray-700">
                  Make group public
                </label>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={createGroupMutation.isPending}
                  className="flex-1 px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {createGroupMutation.isPending ? 'Creating...' : 'Create Group'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Form */}
      {showAddMemberForm && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Member to {selectedGroup.name}</h2>
            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newMember.email}
                  onChange={(e) => setNewMember(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="member@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newMember.name}
                  onChange={(e) => setNewMember(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Member name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={newMember.role}
                  onChange={(e) => setNewMember(prev => ({ ...prev, role: e.target.value as 'leader' | 'member' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="member">Member</option>
                  <option value="leader">Leader</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={addMemberMutation.isPending}
                  className="flex-1 px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {addMemberMutation.isPending ? 'Adding...' : 'Add Member'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddMemberForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Groups List */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading groups...</p>
        </div>
      ) : groups?.length === 0 ? (
        <div className="text-center py-8">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No groups found. Create your first group to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups?.map((group: SigningGroup) => (
            <div key={group._id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
                  {group.description && (
                    <p className="text-sm text-gray-600 mt-1">{group.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {group.isPublic && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Public
                    </span>
                  )}
                  <button
                    onClick={() => setSelectedGroup(group)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span>Owner: {group.owner.name}</span>
                  <span>{group.members.length} members</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Members</span>
                  <button
                    onClick={() => {
                      setSelectedGroup(group)
                      setShowAddMemberForm(true)
                    }}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <UserPlus className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {group.members.slice(0, 3).map((member) => (
                    <div key={member._id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {member.role === 'leader' && <Crown className="h-3 w-3 text-yellow-500" />}
                        <span className="text-gray-700">{member.name}</span>
                      </div>
                      {member.role !== 'leader' && (
                        <button
                          onClick={() => handleRemoveMember(group._id, member._id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  {group.members.length > 3 && (
                    <div className="text-sm text-gray-500 text-center">
                      +{group.members.length - 3} more members
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setSelectedGroup(group)
                    setShowSigningRequestForm(true)
                  }}
                  className="w-full px-3 py-2 border border-blue-600 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50"
                >
                  Create Signing Request
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Signing Request Modal */}
      {showSigningRequestForm && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Create Signing Request for {selectedGroup.name}
            </h2>
            <form onSubmit={handleCreateSigningRequest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Document</label>
                <div className="flex gap-2">
                  <select
                    value={signingRequest.documentId}
                    onChange={(e) => setSigningRequest(prev => ({ ...prev, documentId: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    disabled={documentsLoading}
                  >
                    <option value="">
                      {documentsLoading ? 'Loading documents...' : 'Select a document'}
                    </option>
                    {documents.length === 0 && !documentsLoading && (
                      <option value="" disabled>No documents available</option>
                    )}
                    {documents.map((doc: any) => (
                      <option key={doc._id} value={doc._id}>
                        {doc.title}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => refetchDocuments()}
                    disabled={documentsLoading}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    title="Refresh documents"
                  >
                    🔄
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={signingRequest.subject}
                  onChange={(e) => setSigningRequest(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Optional subject"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  value={signingRequest.message}
                  onChange={(e) => setSigningRequest(prev => ({ ...prev, message: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Optional message to signers"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Signing Order</label>
                <select
                  value={signingRequest.signingOrder}
                  onChange={(e) => setSigningRequest(prev => ({ ...prev, signingOrder: e.target.value as 'parallel' | 'sequential' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="parallel">Parallel (everyone can sign at once)</option>
                  <option value="sequential">Sequential (sign in order)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expires In (Days)</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={signingRequest.expiresInDays}
                  onChange={(e) => setSigningRequest(prev => ({ ...prev, expiresInDays: parseInt(e.target.value) || 7 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={createSigningRequestMutation.isPending}
                  className="flex-1 px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {createSigningRequestMutation.isPending ? 'Creating...' : 'Create Request'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSigningRequestForm(false)
                    setSelectedGroup(null)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
