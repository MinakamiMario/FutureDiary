// src/components/WebLLMBridge.js
import React, {useRef, useImperativeHandle, forwardRef} from 'react';
import {WebView} from 'react-native-webview';

const WebLLMBridge = forwardRef((props, ref) => {
  const webViewRef = useRef(null);
  const pendingRequests = useRef(new Map());
  let requestIdCounter = 0;

  useImperativeHandle(ref, () => ({
    generateText: prompt => {
      return new Promise((resolve, reject) => {
        const requestId = ++requestIdCounter;

        // Store the promise resolvers
        pendingRequests.current.set(requestId, {resolve, reject});

        // Send message to WebView
        const message = JSON.stringify({
          type: 'generate',
          prompt: prompt,
          requestId: requestId,
        });

        webViewRef.current?.postMessage(message);

        // Timeout after 30 seconds
        setTimeout(() => {
          if (pendingRequests.current.has(requestId)) {
            pendingRequests.current.delete(requestId);
            reject(new Error('WebLLM timeout - model may still be loading'));
          }
        }, 30000);
      });
    },

    isReady: () => {
      return new Promise(resolve => {
        const requestId = ++requestIdCounter;

        pendingRequests.current.set(requestId, {
          resolve: ready => resolve(ready),
          reject: () => resolve(false),
        });

        const message = JSON.stringify({
          type: 'ping',
          requestId: requestId,
        });

        webViewRef.current?.postMessage(message);

        // Timeout - assume not ready
        setTimeout(() => {
          if (pendingRequests.current.has(requestId)) {
            pendingRequests.current.delete(requestId);
            resolve(false);
          }
        }, 2000);
      });
    },
  }));

  const handleMessage = event => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (__DEV__) console.log('[WebLLMBridge] Received:', data.type);

      switch (data.type) {
        case 'ready':
          if (__DEV__) console.log('[WebLLMBridge] WebLLM is ready');
          props.onReady?.(true);
          break;

        case 'progress':
          if (__DEV__)
            console.log(
              `[WebLLMBridge] Loading progress: ${Math.round(
                data.progress * 100,
              )}%`,
            );
          props.onProgress?.(data.progress, data.text);
          break;

        case 'generated':
          if (__DEV__)
            console.log('[WebLLMBridge] Text generated successfully');
          if (data.requestId && pendingRequests.current.has(data.requestId)) {
            const {resolve} = pendingRequests.current.get(data.requestId);
            pendingRequests.current.delete(data.requestId);
            resolve(data.result);
          }
          break;

        case 'pong':
          if (data.requestId && pendingRequests.current.has(data.requestId)) {
            const {resolve} = pendingRequests.current.get(data.requestId);
            pendingRequests.current.delete(data.requestId);
            resolve(data.ready || false);
          }
          break;

        case 'error':
          console.error('[WebLLMBridge] Error:', data.error);
          if (data.requestId && pendingRequests.current.has(data.requestId)) {
            const {reject} = pendingRequests.current.get(data.requestId);
            pendingRequests.current.delete(data.requestId);
            reject(new Error(data.error));
          } else {
            props.onError?.(new Error(data.error));
          }
          break;

        default:
          if (__DEV__)
            console.log('[WebLLMBridge] Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('[WebLLMBridge] Message parsing error:', error);
      props.onError?.(error);
    }
  };

  const getWebLLMHTML = () => {
    // Use static HTML content for React Native without Expo
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WebLLM</title>
</head>
<body>
    <script>
        // Mock WebLLM implementation for React Native
        let isReady = false;
        
        // Simulate initialization
        setTimeout(() => {
            isReady = true;
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'ready'
            }));
        }, 1000);
        
        // Message handler
        document.addEventListener('message', function(event) {
            const data = JSON.parse(event.data);
            
            if (data.type === 'ping') {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'pong',
                    requestId: data.requestId,
                    ready: isReady
                }));
            }
            
            if (data.type === 'generate') {
                // Mock response with delay
                setTimeout(() => {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'generated',
                        requestId: data.requestId,
                        result: "Mock AI response: " + data.prompt
                    }));
                }, 500);
            }
        });
    </script>
</body>
</html>
    `;
    return 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent);
  };

  return (
    <WebView
      ref={webViewRef}
      source={{uri: getWebLLMHTML()}}
      style={{
        position: 'absolute',
        top: -1000,
        left: -1000,
        width: 1,
        height: 1,
        opacity: 0,
      }}
      javaScriptEnabled={true}
      domStorageEnabled={true}
      allowsInlineMediaPlayback={true}
      mediaPlaybackRequiresUserAction={false}
      allowsFullscreenVideo={false}
      onMessage={handleMessage}
      onError={error => {
        console.error('[WebLLMBridge] WebView error:', error);
        props.onError?.(new Error('WebView failed to load'));
      }}
      onHttpError={error => {
        console.error('[WebLLMBridge] HTTP error:', error);
        props.onError?.(new Error('WebLLM HTTP error'));
      }}
      // Security settings
      allowsBackForwardNavigationGestures={false}
      bounces={false}
      scrollEnabled={false}
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      // Performance settings
      cacheEnabled={true}
      incognito={false}
      thirdPartyCookiesEnabled={false}
    />
  );
});

WebLLMBridge.displayName = 'WebLLMBridge';

export default WebLLMBridge;
