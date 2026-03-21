import { useState } from 'react';
import { toast } from 'react-toastify';
import { FiUser, FiMail, FiBriefcase, FiSave, FiLock, FiShield } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { updateProfile, changePassword } from '../services/api';
import './AccountSettings.css';

function AccountSettings() {
  const { user, updateUser } = useAuth();
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    company: user?.company || '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const handleProfileChange = (e) => setProfileForm({ ...profileForm, [e.target.name]: e.target.value });
  const handlePasswordChange = (e) => setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value });

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!profileForm.name || !profileForm.email) {
      toast.error('Name and email are required');
      return;
    }
    setSavingProfile(true);
    try {
      const res = await updateProfile(profileForm);
      updateUser(res.data.user || { ...user, ...profileForm });
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      toast.error('Please fill in all password fields');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    setSavingPassword(true);
    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="settings-page">
      <h1>Account Settings</h1>

      {/* Plan Info */}
      <div className="settings-plan card">
        <div className="plan-info">
          <FiShield size={20} />
          <div>
            <strong>Current Plan: {user?.plan || 'Free'}</strong>
            <p>{user?.scans_used || 0} / {user?.scans_limit || 5} scans used this month</p>
          </div>
        </div>
        <div className="plan-bar">
          <div
            className="plan-bar-fill"
            style={{ width: `${Math.min(100, ((user?.scans_used || 0) / (user?.scans_limit || 5)) * 100)}%` }}
          />
        </div>
      </div>

      {/* Profile */}
      <form className="settings-section card" onSubmit={handleProfileSubmit}>
        <h2>Profile Information</h2>
        <div className="settings-form-grid">
          <div className="form-group">
            <label>Full Name</label>
            <div className="input-icon-wrap">
              <FiUser className="input-icon" />
              <input
                name="name"
                type="text"
                className="form-input form-input-icon"
                value={profileForm.name}
                onChange={handleProfileChange}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Email Address</label>
            <div className="input-icon-wrap">
              <FiMail className="input-icon" />
              <input
                name="email"
                type="email"
                className="form-input form-input-icon"
                value={profileForm.email}
                onChange={handleProfileChange}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Company</label>
            <div className="input-icon-wrap">
              <FiBriefcase className="input-icon" />
              <input
                name="company"
                type="text"
                className="form-input form-input-icon"
                placeholder="Optional"
                value={profileForm.company}
                onChange={handleProfileChange}
              />
            </div>
          </div>
        </div>
        <button type="submit" className="btn btn-accent" disabled={savingProfile}>
          {savingProfile ? 'Saving...' : <><FiSave /> Save Changes</>}
        </button>
      </form>

      {/* Password */}
      <form className="settings-section card" onSubmit={handlePasswordSubmit}>
        <h2>Change Password</h2>
        <div className="settings-form-grid">
          <div className="form-group">
            <label>Current Password</label>
            <div className="input-icon-wrap">
              <FiLock className="input-icon" />
              <input
                name="currentPassword"
                type="password"
                className="form-input form-input-icon"
                placeholder="Enter current password"
                value={passwordForm.currentPassword}
                onChange={handlePasswordChange}
              />
            </div>
          </div>
          <div className="form-group">
            <label>New Password</label>
            <div className="input-icon-wrap">
              <FiLock className="input-icon" />
              <input
                name="newPassword"
                type="password"
                className="form-input form-input-icon"
                placeholder="Min 8 characters"
                value={passwordForm.newPassword}
                onChange={handlePasswordChange}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Confirm New Password</label>
            <div className="input-icon-wrap">
              <FiLock className="input-icon" />
              <input
                name="confirmPassword"
                type="password"
                className="form-input form-input-icon"
                placeholder="Repeat new password"
                value={passwordForm.confirmPassword}
                onChange={handlePasswordChange}
              />
            </div>
          </div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={savingPassword}>
          {savingPassword ? 'Changing...' : <><FiLock /> Change Password</>}
        </button>
      </form>
    </div>
  );
}

export default AccountSettings;
