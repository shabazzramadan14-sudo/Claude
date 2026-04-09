import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { followsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function FollowButton({ providerId, small = false }) {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) return;
    followsAPI.status(providerId)
      .then(({ data }) => setIsFollowing(data.isFollowing))
      .catch(() => {});
  }, [providerId, isLoggedIn]);

  const handleClick = async () => {
    if (!isLoggedIn) { navigate('/auth'); return; }
    setLoading(true);
    try {
      if (isFollowing) {
        await followsAPI.unfollow(providerId);
        setIsFollowing(false);
      } else {
        await followsAPI.follow(providerId);
        setIsFollowing(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const sz = small ? { padding: '6px 14px', fontSize: 12 } : { padding: '10px 24px', fontSize: 14 };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={isFollowing ? 'btn btn-secondary' : 'btn btn-primary'}
      style={{ ...sz, width: small ? '100%' : 'auto' }}
    >
      {loading ? '...' : isFollowing ? 'Following' : 'Follow'}
    </button>
  );
}
