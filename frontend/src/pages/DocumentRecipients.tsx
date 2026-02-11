import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, X, Mail, User as UserIcon, Eye, Edit3, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { DocumentRecipient } from '../types';

interface RecipientForm {
  email: string;
  name: string;
  role: 'signer' | 'witness' | 'reviewer';
  message?: string;
  witnessFor?: string;
}

export default function DocumentRecipients() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [recipients, setRecipients] = useState<DocumentRecipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRecipient, setNewRecipient] = useState<RecipientForm>({
    email: '',
    name: '',
    role: 'signer',
    message: ''
  });

  useEffect(() => {
    fetchRecipients();
  }, [id]);

  const fetchRecipients = async () => {
    try {
      const response = await api.getDocumentRecipients(id!);
      if (response.success) {
        setRecipients(response.data);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to fetch recipients');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecipient = async () => {
    if (!newRecipient.email || !newRecipient.name) {
      toast.error('Email and name are required');
      return;
    }

    try {
      const response = await api.addDocumentRecipients(id!, {
        recipients: [newRecipient]
      });
      
      if (response.success) {
        toast.success('Recipient added successfully');
        setNewRecipient({ email: '', name: '', role: 'signer', message: '' });
        setShowAddForm(false);
        fetchRecipients();
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to add recipient');
    }
  };

  const handleDeleteRecipient = async (recipientId: string) => {
    if (!window.confirm('Are you sure you want to remove this recipient?')) {
      return;
    }

    try {
      const response = await api.deleteRecipient(recipientId);
      if (response.success) {
        toast.success('Recipient removed successfully');
        fetchRecipients();
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to remove recipient');
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'signer':
        return <UserIcon className="h-4 w-4" />;
      case 'witness':
        return <Eye className="h-4 w-4" />;
      case 'reviewer':
        return <Edit3 className="h-4 w-4" />;
      default:
        return <UserIcon className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'signed':
        return 'bg-green-100 text-green-800';
      case 'declined':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Document Recipients</h1>
        <button
          onClick={() => navigate(`/documents/${id}`)}
          className="text-gray-600 hover:text-gray-900"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Add Recipient Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Add Recipient</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={newRecipient.name}
                onChange={(e) => setNewRecipient({ ...newRecipient, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter recipient name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                value={newRecipient.email}
                onChange={(e) => setNewRecipient({ ...newRecipient, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="recipient@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={newRecipient.role}
                onChange={(e) => setNewRecipient({ ...newRecipient, role: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="signer">Signer</option>
                <option value="witness">Witness</option>
                <option value="reviewer">Reviewer</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message (Optional)</label>
              <textarea
                value={newRecipient.message}
                onChange={(e) => setNewRecipient({ ...newRecipient, message: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Add a message for the recipient..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleAddRecipient}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Mail className="h-4 w-4" />
              Send Invitation
            </button>
          </div>
        </div>
      )}

      {/* Add Recipient Button */}
      {!showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 flex items-center justify-center gap-2 mb-6"
        >
          <Plus className="h-5 w-5" />
          Add Recipient
        </button>
      )}

      {/* Recipients List */}
      {recipients.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg">
          <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No recipients added</h3>
          <p className="text-gray-600">Add recipients to send signature requests</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recipients.map((recipient) => (
                  <tr key={recipient._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getRoleIcon(recipient.role)}
                        <span className="ml-2 text-sm font-medium text-gray-900">{recipient.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{recipient.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(recipient.status)}`}>
                        {recipient.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(recipient.status)}`}>
                        {recipient.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleDeleteRecipient(recipient._id)}
                        className="text-red-600 hover:text-red-900"
                        title="Remove recipient"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
