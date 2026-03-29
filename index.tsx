
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './src/App';

// 簡單的載入指示器
const LoadingScreen = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#101014',
    color: 'white',
    fontFamily: 'Inter, sans-serif'
  }}>
    <h1 style={{ color: '#00FFFF', marginBottom: '20px' }}>
      Trap Nation-Style Music Visualizer
    </h1>
    <p>載入中...</p>
  </div>
);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// 先顯示載入畫面
const root = ReactDOM.createRoot(rootElement);
root.render(<LoadingScreen />);

// 延遲載入主應用程式
setTimeout(() => {
  try {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error('Failed to load App:', error);
    root.render(
      <div style={{
        padding: '20px',
        color: 'white',
        backgroundColor: '#101014',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <h1>載入錯誤</h1>
        <p>應用程式載入時發生錯誤：</p>
        <pre style={{ color: 'red', marginTop: '10px' }}>
          {error.message}
        </pre>
        <button 
          onClick={() => window.location.reload()} 
          style={{ 
            marginTop: '20px', 
            padding: '10px 20px', 
            backgroundColor: '#00FFFF', 
            color: 'black',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          重新載入
        </button>
      </div>
    );
  }
}, 1000); // 1秒後載入主應用程式
