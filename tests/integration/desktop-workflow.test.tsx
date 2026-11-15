/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Navbar } from '@/components/navbar';
import { PairingModal } from '@/components/pairing/pairing-modal';
import { ApprovalDialog } from '@/components/pairing/approval-dialog';
import { PairedDevicesDrawer } from '@/components/pairing/paired-devices-drawer';
import { DEFAULT_SETTINGS } from '@/lib/presentation/types';
import { SettingsModal } from '@/components/dashboard/settings-modal';

describe('Desktop UI Components (Integration)', () => {
  it('renders Navbar with branding and status', () => {
    render(
      <Navbar
        cloudMode="local"
        isConnected={true}
        pairedDeviceCount={2}
        onOpenSettings={vi.fn()}
        onOpenPairedDevices={vi.fn()}
        onOpenTestController={vi.fn()}
      />
    );

    expect(screen.getByText('Simply PPT')).toBeInTheDocument();
    expect(screen.getByText('A smarter way to present.')).toBeInTheDocument();
    expect(screen.getByText('Local / Offline')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // 2 paired devices
  });

  it('renders PairingModal with 6-digit code and countdown', () => {
    const onRefresh = vi.fn();
    render(
      <PairingModal
        isOpen={true}
        onClose={vi.fn()}
        pairCode="482910"
        expiresAt={new Date(Date.now() + 180000).toISOString()}
        onRefreshCode={onRefresh}
      />
    );

    expect(screen.getByText('Pair Mobile Remote Controller')).toBeInTheDocument();
    expect(screen.getByText('Six-Digit Pairing Code')).toBeInTheDocument();
    // Digits
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();

    const refreshBtn = screen.getByText('Generate New Code');
    fireEvent.click(refreshBtn);
    expect(onRefresh).toHaveBeenCalled();
  });

  it('renders ApprovalDialog with device details and triggers approval', () => {
    const onApprove = vi.fn();
    const onReject = vi.fn();

    render(
      <ApprovalDialog
        request={{
          id: 'req-42',
          sessionId: 'sess-1',
          deviceId: 'galaxy-s24',
          deviceName: 'Hiro’s Galaxy S24 Ultra',
          status: 'pending',
          requestedAt: new Date().toISOString(),
        }}
        onApprove={onApprove}
        onReject={onReject}
      />
    );

    expect(screen.getByText('Pairing Request Received')).toBeInTheDocument();
    expect(screen.getByText('Hiro’s Galaxy S24 Ultra')).toBeInTheDocument();

    const approveBtn = screen.getByText('Approve Device');
    fireEvent.click(approveBtn);
    expect(onApprove).toHaveBeenCalledWith('req-42');
  });

  it('renders PairedDevicesDrawer and allows device revocation', () => {
    const onRevoke = vi.fn();

    render(
      <PairedDevicesDrawer
        isOpen={true}
        onClose={vi.fn()}
        devices={[
          {
            id: 'dev-1',
            deviceId: 'pixel-8',
            deviceName: 'Pixel 8 Pro',
            deviceToken: 'tok-abc',
            pairedAt: new Date().toISOString(),
            isActive: true,
          },
        ]}
        onRevokeDevice={onRevoke}
        onOpenPairingModal={vi.fn()}
      />
    );

    expect(screen.getByText('Paired Remote Controllers')).toBeInTheDocument();
    expect(screen.getByText('Pixel 8 Pro')).toBeInTheDocument();

    const disconnectBtn = screen.getByText('Disconnect');
    fireEvent.click(disconnectBtn);
    expect(onRevoke).toHaveBeenCalledWith('pixel-8');
  });

  it('renders SettingsModal with display options and keyboard shortcuts', () => {
    const onSave = vi.fn();

    render(
      <SettingsModal
        isOpen={true}
        onClose={vi.fn()}
        settings={DEFAULT_SETTINGS}
        onSaveSettings={onSave}
        cloudMode="local"
      />
    );

    expect(screen.getByText('Application Settings')).toBeInTheDocument();
    expect(screen.getByText('Pure Black')).toBeInTheDocument();
    expect(screen.getByText('Deep Violet')).toBeInTheDocument();

    // Switch to shortcuts tab
    fireEvent.click(screen.getByText('Keyboard Shortcuts'));
    expect(screen.getByText('Toggle Fullscreen')).toBeInTheDocument();
    expect(screen.getByText('Exit Presentation')).toBeInTheDocument();
  });
});
