import React, { useState, useEffect } from 'react';
import { Alert, Badge, Button, Tooltip } from 'antd';
import { WifiOutlined, DisconnectOutlined, CloudUploadOutlined } from '@ant-design/icons';
import { offlineDataService } from '../services/offlineDataService';

interface OfflineIndicatorProps {
  onSync?: () => void;
}

/**
 * Offline Indicator Component
 * Shows the current online/offline status and sync queue status
 */
export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ onSync }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncQueueCount, setSyncQueueCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      console.log('App is now online');
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('App is now offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check sync queue periodically
    const checkSyncQueue = async () => {
      try {
        const queue = await offlineDataService.getSyncQueue();
        setSyncQueueCount(queue.length);
      } catch (error) {
        console.error('Error checking sync queue:', error);
      }
    };

    const interval = setInterval(checkSyncQueue, 5000);
    checkSyncQueue(); // Initial check

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      if (onSync) {
        await onSync();
      }
      // Refresh sync queue count
      const queue = await offlineDataService.getSyncQueue();
      setSyncQueueCount(queue.length);
    } catch (error) {
      console.error('Error during sync:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  if (isOnline && syncQueueCount === 0) {
    return null; // Don't show indicator if online and no pending items
  }

  return (
    <div style={{ marginBottom: '16px' }}>
      {!isOnline && (
        <Alert
          message="Offline Mode"
          description="You are currently offline. Your changes will be saved locally and synced when you're back online."
          type="warning"
          icon={<DisconnectOutlined />}
          showIcon
          closable
        />
      )}

      {isOnline && syncQueueCount > 0 && (
        <Alert
          message="Pending Sync"
          description={
            <div>
              <div style={{ marginBottom: 8 }}>
                {`You have ${syncQueueCount} item(s) waiting to be synced.`}
              </div>
              <Button
                size="small"
                type="primary"
                loading={isSyncing}
                onClick={handleSync}
              >
                Sync Now
              </Button>
            </div>
          }
          type="info"
          icon={<CloudUploadOutlined />}
          showIcon
          closable
        />
      )}

      {/* Status badge in corner */}
      <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 999 }}>
        <Tooltip title={isOnline ? 'Online' : 'Offline'}>
          <Badge
            count={syncQueueCount}
            style={{
              backgroundColor: isOnline ? '#52c41a' : '#ff4d4f',
              cursor: 'pointer'
            }}
          >
            <Button
              type="primary"
              shape="circle"
              icon={isOnline ? <WifiOutlined /> : <DisconnectOutlined />}
              style={{
                backgroundColor: isOnline ? '#52c41a' : '#ff4d4f',
                borderColor: isOnline ? '#52c41a' : '#ff4d4f'
              }}
              onClick={handleSync}
              disabled={!isOnline || syncQueueCount === 0 || isSyncing}
            />
          </Badge>
        </Tooltip>
      </div>
    </div>
  );
};

export default OfflineIndicator;

