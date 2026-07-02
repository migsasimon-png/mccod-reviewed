import React, { useState, useEffect } from 'react';
import { Alert, Button, Modal } from 'antd';
import { CloudDownloadOutlined } from '@ant-design/icons';

interface PWAUpdateNotificationProps {
  onUpdate?: () => void;
}

/**
 * PWA Update Notification Component
 * Notifies users when a new version of the app is available
 */
export const PWAUpdateNotification: React.FC<PWAUpdateNotificationProps> = ({ onUpdate }) => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingServiceWorker, setWaitingServiceWorker] = useState<ServiceWorkerRegistration | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    // Check for service worker updates
    const checkForUpdates = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          // Check for updates
          await registration.update();

          // Listen for new service worker
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New service worker is ready
                  setUpdateAvailable(true);
                  setWaitingServiceWorker(registration);
                  setShowModal(true);
                }
              });
            }
          });
        }
      } catch (error) {
        console.error('Error checking for updates:', error);
      }
    };

    // Check for updates on load
    checkForUpdates();

    // Check for updates periodically (every 60 seconds)
    const interval = setInterval(checkForUpdates, 60000);

    return () => clearInterval(interval);
  }, []);

  const handleUpdate = () => {
    if (waitingServiceWorker?.waiting) {
      // Tell the service worker to skip waiting
      waitingServiceWorker.waiting.postMessage({ type: 'SKIP_WAITING' });

      // Reload the page
      window.location.reload();

      if (onUpdate) {
        onUpdate();
      }
    }
  };

  const handleDismiss = () => {
    setShowModal(false);
  };

  if (!updateAvailable) {
    return null;
  }

  return (
    <>
      {/* Alert notification */}
      <Alert
        message="Update Available"
        description={
          <div>
            <div style={{ marginBottom: 8 }}>
              A new version of the app is available. Click 'Update Now' to get
              the latest features and improvements.
            </div>
            <Button
              size="small"
              type="primary"
              onClick={() => setShowModal(true)}
            >
              Update Now
            </Button>
          </div>
        }
        type="success"
        icon={<CloudDownloadOutlined />}
        showIcon
        style={{ marginBottom: '16px' }}
      />

      {/* Confirmation modal */}
      <Modal
        title="App Update Available"
        visible={showModal}
        onOk={handleUpdate}
        onCancel={handleDismiss}
        okText="Update Now"
        cancelText="Later"
        centered
      >
        <p>
          A new version of the Medical Certificate of Cause of Death app is available.
        </p>
        <p>
          <strong>What's new:</strong>
        </p>
        <ul>
          <li>Improved offline functionality</li>
          <li>Better performance and caching</li>
          <li>Bug fixes and improvements</li>
        </ul>
        <p>
          <strong>Note:</strong> The page will reload to apply the update.
        </p>
      </Modal>
    </>
  );
};

export default PWAUpdateNotification;

