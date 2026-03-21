import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  FiUser, FiShield, FiSettings, FiBriefcase,
  FiSave, FiTrash2, FiPlus, FiLogOut
} from 'react-icons/fi';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Settings.css';

function Settings() {
  const { user, setUser } = useAuth();
  const [tab, setTab] = useState('profile');
  const [saving, setSaving] = useState(false);

  // Profile
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    job_title: '',
    department: '',
    bio: '',
    avatar_url: '',
    timezone: 'UTC',
    language: 'en',
  });

  // Security
  const [passwords, setPasswords] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [sessions, setSessions] = useState([]);
  const [securityLog, setSecurityLog] = useState([]);

  // Preferences
  const [prefs, setPrefs] = useState({
    theme: 'light',
    keyboard_shortcuts: true,
    email_notifications: true,
    push_notifications: true,
  });

  // Organization
  const [org, setOrg] = useState(null);
  const [orgForm, setOrgForm] = useState({ name: '', industry: '', logo_url: '' });
  const [members, setMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (tab === 'security') fetchSecurity();
    if (tab === 'organization') fetchOrg();
  }, [tab]);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/auth/profile');
      const p = res.data.user || res.data;
      setProfile({
        name: p.name || '',
        email: p.email || '',
        phone: p.phone || '',
        job_title: p.job_title || '',
        department: p.department || '',
        bio: p.bio || '',
        avatar_url: p.avatar_url || '',
        timezone: p.timezone || 'UTC',
        language: p.language || 'en',
      });
    } catch {
      // Use defaults
    }
  };

  const fetchSecurity = async () => {
    try {
      const [sessRes, logRes] = await Promise.all([
        api.get('/auth/sessions').catch(() => ({ data: { sessions: [] } })),
        api.get('/auth/security-log').catch(() => ({ data: { events: [] } })),
      ]);
      setSessions(sessRes.data.sessions || sessRes.data || []);
      setSecurityLog(logRes.data.events || logRes.data || []);
    } catch {
      // Defaults
    }
  };

  const fetchOrg = async () => {
    try {
      const res = await api.get('/organization');
      const o = res.data.organization || res.data;
      if (o && o.id) {
        setOrg(o);
        setOrgForm({ name: o.name || '', industry: o.industry || '', logo_url: o.logo_url || '' });
        const memRes = await api.get('/organization/members').catch(() => ({ data: { members: [] } }));
        setMembers(memRes.data.members || memRes.data || []);
      }
    } catch {
      setOrg(null);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await api.put('/auth/profile', profile);
      if (setUser && res.data.user) setUser(res.data.user);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwords.new_password !== passwords.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwords.new_password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setSaving(true);
    try {
      await api.put('/auth/change-password', {
        current_password: passwords.current_password,
        new_password: passwords.new_password,
      });
      toast.success('Password changed');
      setPasswords({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const terminateSession = async (sessionId) => {
    try {
      await api.delete(`/auth/sessions/${sessionId}`);
      setSessions((prev) => prev.filter((s) => (s.id || s._id) !== sessionId));
      toast.success('Session terminated');
    } catch {
      toast.error('Failed to terminate session');
    }
  };

  const handleSavePrefs = async () => {
    setSaving(true);
    try {
      await api.put('/auth/preferences', prefs);
      toast.success('Preferences saved');
    } catch {
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateOrg = async () => {
    if (!orgForm.name.trim()) {
      toast.error('Please enter an organization name');
      return;
    }
    setSaving(true);
    try {
      const res = await api.post('/organization', orgForm);
      setOrg(res.data.organization || res.data);
      toast.success('Organization created');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create organization');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOrg = async () => {
    setSaving(true);
    try {
      await api.put(`/organization/${org.id || org._id}`, orgForm);
      toast.success('Organization updated');
    } catch {
      toast.error('Failed to update organization');
    } finally {
      setSaving(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    try {
      await api.post('/organization/invite', { email: inviteEmail });
      toast.success('Invitation sent');
      setInviteEmail('');
      fetchOrg();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send invite');
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Remove this member?')) return;
    try {
      await api.delete(`/organization/members/${memberId}`);
      setMembers((prev) => prev.filter((m) => (m.id || m._id) !== memberId));
      toast.success('Member removed');
    } catch {
      toast.error('Failed to remove member');
    }
  };

  const timezones = [
    'UTC', 'America/New_York', 'America/Chicago', 'America/Denver',
    'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Asia/Tokyo',
    'Asia/Shanghai', 'Australia/Sydney',
  ];

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>Settings</h1>
      </div>

      <div className="settings-tabs">
        <button className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}>
          <FiUser style={{ marginRight: 6 }} /> Profile
        </button>
        <button className={tab === 'security' ? 'active' : ''} onClick={() => setTab('security')}>
          <FiShield style={{ marginRight: 6 }} /> Security
        </button>
        <button className={tab === 'preferences' ? 'active' : ''} onClick={() => setTab('preferences')}>
          <FiSettings style={{ marginRight: 6 }} /> Preferences
        </button>
        <button className={tab === 'organization' ? 'active' : ''} onClick={() => setTab('organization')}>
          <FiBriefcase style={{ marginRight: 6 }} /> Organization
        </button>
      </div>

      <div className="settings-section">
        {/* Profile Tab */}
        {tab === 'profile' && (
          <div className="settings-card">
            <h2>Profile Information</h2>
            <div className="form-row">
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="text"
                  className="form-input"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Job Title</label>
                <input
                  type="text"
                  className="form-input"
                  value={profile.job_title}
                  onChange={(e) => setProfile({ ...profile, job_title: e.target.value })}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Department</label>
                <input
                  type="text"
                  className="form-input"
                  value={profile.department}
                  onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Avatar URL</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://..."
                  value={profile.avatar_url}
                  onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Bio</label>
              <textarea
                className="form-input"
                rows={3}
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Timezone</label>
                <select
                  className="form-input"
                  value={profile.timezone}
                  onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                >
                  {timezones.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Language</label>
                <select
                  className="form-input"
                  value={profile.language}
                  onChange={(e) => setProfile({ ...profile, language: e.target.value })}
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="pt">Portuguese</option>
                </select>
              </div>
            </div>
            <div className="settings-actions">
              <button className="btn btn-accent" onClick={handleSaveProfile} disabled={saving}>
                <FiSave /> {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {tab === 'security' && (
          <>
            <div className="settings-card">
              <h2>Change Password</h2>
              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={passwords.current_password}
                  onChange={(e) => setPasswords({ ...passwords, current_password: e.target.value })}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>New Password</label>
                  <input
                    type="password"
                    className="form-input"
                    value={passwords.new_password}
                    onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Confirm Password</label>
                  <input
                    type="password"
                    className="form-input"
                    value={passwords.confirm_password}
                    onChange={(e) => setPasswords({ ...passwords, confirm_password: e.target.value })}
                  />
                </div>
              </div>
              <div className="settings-actions">
                <button className="btn btn-accent" onClick={handleChangePassword} disabled={saving}>
                  <FiShield /> Update Password
                </button>
              </div>
            </div>

            <div className="settings-card">
              <h2>Active Sessions</h2>
              <div className="sessions-list">
                {sessions.length === 0 ? (
                  <p style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>No active sessions found.</p>
                ) : (
                  sessions.map((s) => {
                    const sid = s.id || s._id;
                    return (
                      <div key={sid} className="session-item">
                        <div className="session-info">
                          <span className="session-device">
                            {s.device || 'Unknown Device'}
                            {s.current && <span className="session-current">Current</span>}
                          </span>
                          <span className="session-details">
                            {s.location || 'Unknown'} &middot; Last active {s.last_active ? new Date(s.last_active).toLocaleString() : 'N/A'}
                          </span>
                        </div>
                        {!s.current && (
                          <button className="btn btn-sm btn-danger" onClick={() => terminateSession(sid)}>
                            <FiLogOut /> Terminate
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="security-log">
                <h3>Security Log</h3>
                <div className="log-list">
                  {securityLog.length === 0 ? (
                    <p style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>No recent events.</p>
                  ) : (
                    securityLog.slice(0, 10).map((ev, i) => (
                      <div key={i} className="log-item">
                        <span className="log-event">{ev.event || ev.action}</span>
                        <span className="log-time">{new Date(ev.created_at || ev.timestamp).toLocaleString()}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Preferences Tab */}
        {tab === 'preferences' && (
          <div className="settings-card">
            <h2>Preferences</h2>
            <div className="pref-toggles">
              <div className="pref-toggle-item">
                <span>Dark Theme</span>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={prefs.theme === 'dark'}
                    onChange={() => setPrefs({ ...prefs, theme: prefs.theme === 'dark' ? 'light' : 'dark' })}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
              <div className="pref-toggle-item">
                <span>Keyboard Shortcuts</span>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={prefs.keyboard_shortcuts}
                    onChange={() => setPrefs({ ...prefs, keyboard_shortcuts: !prefs.keyboard_shortcuts })}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
              <div className="pref-toggle-item">
                <span>Email Notifications</span>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={prefs.email_notifications}
                    onChange={() => setPrefs({ ...prefs, email_notifications: !prefs.email_notifications })}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
              <div className="pref-toggle-item">
                <span>Push Notifications</span>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={prefs.push_notifications}
                    onChange={() => setPrefs({ ...prefs, push_notifications: !prefs.push_notifications })}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
            </div>
            <div className="settings-actions" style={{ marginTop: 20 }}>
              <button className="btn btn-accent" onClick={handleSavePrefs} disabled={saving}>
                <FiSave /> Save Preferences
              </button>
            </div>
          </div>
        )}

        {/* Organization Tab */}
        {tab === 'organization' && (
          <>
            {org ? (
              <>
                <div className="settings-card">
                  <h2>Organization</h2>
                  <div className="form-group">
                    <label>Organization Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={orgForm.name}
                      onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Industry</label>
                      <input
                        type="text"
                        className="form-input"
                        value={orgForm.industry}
                        onChange={(e) => setOrgForm({ ...orgForm, industry: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Logo URL</label>
                      <input
                        type="url"
                        className="form-input"
                        placeholder="https://..."
                        value={orgForm.logo_url}
                        onChange={(e) => setOrgForm({ ...orgForm, logo_url: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="settings-actions">
                    <button className="btn btn-accent" onClick={handleSaveOrg} disabled={saving}>
                      <FiSave /> Save Organization
                    </button>
                  </div>
                </div>

                <div className="settings-card">
                  <h2>Members</h2>
                  <div className="members-list">
                    {members.map((m) => {
                      const mid = m.id || m._id;
                      return (
                        <div key={mid} className="member-item">
                          <div className="member-info">
                            <div className="member-avatar">
                              {(m.name || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="member-details">
                              <span className="member-name">{m.name}</span>
                              <span className="member-email">{m.email}</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className={`member-role ${m.role}`}>{m.role}</span>
                            {m.role !== 'owner' && (
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => handleRemoveMember(mid)}
                              >
                                <FiTrash2 />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="invite-row">
                    <input
                      type="email"
                      className="form-input"
                      placeholder="Email address..."
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleInvite(); }}
                    />
                    <button className="btn btn-accent" onClick={handleInvite}>
                      <FiPlus /> Invite
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="settings-card">
                <div className="create-org-prompt">
                  <FiBriefcase size={48} color="var(--text-light)" />
                  <p>You don't belong to an organization yet.</p>
                  <div className="form-group" style={{ maxWidth: 400, margin: '0 auto 16px' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Organization name..."
                      value={orgForm.name}
                      onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                    />
                  </div>
                  <button className="btn btn-accent" onClick={handleCreateOrg} disabled={saving}>
                    <FiPlus /> Create Organization
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Settings;
