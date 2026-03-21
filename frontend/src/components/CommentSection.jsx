import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FiEdit2, FiTrash2, FiSend } from 'react-icons/fi';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import './CommentSection.css';

function CommentSection({ entityType, entityId }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    if (entityType && entityId) {
      fetchComments();
    }
  }, [entityType, entityId]);

  const fetchComments = async () => {
    try {
      const res = await api.get(`/comments`, {
        params: { entity_type: entityType, entity_id: entityId },
      });
      setComments(res.data.comments || res.data || []);
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      const res = await api.post('/comments', {
        entity_type: entityType,
        entity_id: entityId,
        content: newComment.trim(),
      });
      const comment = res.data.comment || res.data;
      setComments((prev) => [...prev, comment]);
      setNewComment('');
    } catch {
      toast.error('Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (commentId) => {
    if (!editContent.trim()) return;
    try {
      await api.put(`/comments/${commentId}`, { content: editContent.trim() });
      setComments((prev) =>
        prev.map((c) =>
          (c.id || c._id) === commentId ? { ...c, content: editContent.trim() } : c
        )
      );
      setEditingId(null);
      setEditContent('');
    } catch {
      toast.error('Failed to edit comment');
    }
  };

  const handleDelete = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await api.delete(`/comments/${commentId}`);
      setComments((prev) => prev.filter((c) => (c.id || c._id) !== commentId));
    } catch {
      toast.error('Failed to delete comment');
    }
  };

  const startEdit = (comment) => {
    setEditingId(comment.id || comment._id);
    setEditContent(comment.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const timeAgo = (date) => {
    const now = new Date();
    const d = new Date(date);
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    return diffDays < 7 ? `${diffDays}d ago` : d.toLocaleDateString();
  };

  const isOwner = (comment) => {
    const userId = user?.id || user?._id;
    const commentUserId = comment.user_id || comment.userId;
    return userId && userId === commentUserId;
  };

  return (
    <div className="comment-section">
      <div className="comment-section-header">
        <h3>Comments</h3>
        <span className="comment-count">{comments.length} comment{comments.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="comment-form">
        <textarea
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit();
          }}
        />
        <div className="comment-form-actions">
          <button
            className="btn btn-accent btn-sm"
            onClick={handleSubmit}
            disabled={submitting || !newComment.trim()}
          >
            <FiSend /> {submitting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="comments-loading">
          <div className="spinner" />
        </div>
      ) : comments.length === 0 ? (
        <div className="comments-empty">
          No comments yet. Be the first to comment!
        </div>
      ) : (
        <div className="comment-list">
          {comments.map((comment) => {
            const cid = comment.id || comment._id;
            const initial = (comment.user_name || comment.userName || 'U').charAt(0).toUpperCase();
            return (
              <div key={cid} className="comment-item">
                <div className="comment-avatar">
                  {comment.user_avatar ? (
                    <img src={comment.user_avatar} alt="" />
                  ) : (
                    initial
                  )}
                </div>
                <div className="comment-body">
                  <div className="comment-header">
                    <span className="comment-author">
                      {comment.user_name || comment.userName || 'Unknown User'}
                    </span>
                    <span className="comment-time">
                      {timeAgo(comment.created_at || comment.createdAt)}
                    </span>
                  </div>
                  {editingId === cid ? (
                    <>
                      <textarea
                        className="comment-edit-textarea"
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                      />
                      <div className="comment-edit-actions">
                        <button className="btn btn-sm btn-accent" onClick={() => handleEdit(cid)}>
                          Save
                        </button>
                        <button className="btn btn-sm btn-outline" onClick={cancelEdit}>
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="comment-content">{comment.content}</div>
                      {isOwner(comment) && (
                        <div className="comment-actions">
                          <button className="comment-action-btn" onClick={() => startEdit(comment)}>
                            <FiEdit2 size={13} /> Edit
                          </button>
                          <button className="comment-action-btn delete" onClick={() => handleDelete(cid)}>
                            <FiTrash2 size={13} /> Delete
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default CommentSection;
