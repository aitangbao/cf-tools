import { useAutoTrackVisit } from '../../hooks/useAnalytics';

const FileTransfer = () => {
  useAutoTrackVisit('F2F文件直传');

  return (
    <div style={{ padding: '24px', height: 'calc(100vh - 64px)' }}>
      <iframe
        src="https://f.219921.xyz/"
        title="文件传输"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          borderRadius: '8px',
        }}
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
};

export default FileTransfer;