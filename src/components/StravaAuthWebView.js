// src/components/StravaAuthWebView.js
import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { WebView } from 'react-native-webview';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Typography from './ui/Typography';
import Button from './ui/Button';
import { Colors, Spacing } from '../styles/designSystem';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const STRAVA_CONFIG = {
  CLIENT_ID: '171450',
  CLIENT_SECRET: 'f4fbab8e18c3e0ac6e5c29b24c3e5cf17ad86e0c',
  REDIRECT_URI: 'http://localhost/callback',
  SCOPE: 'read,activity:read_all,profile:read_all',
  AUTH_BASE_URL: 'https://www.strava.com/oauth/authorize',
  TOKEN_URL: 'https://www.strava.com/oauth/token'
};

const StravaAuthWebView = ({ 
  visible, 
  onSuccess, 
  onCancel, 
  onError 
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [isExchangingToken, setIsExchangingToken] = useState(false);
  const webViewRef = useRef(null);

  // Generate a random state parameter for security
  const generateState = () => {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  };

  // Build the authorization URL
  const buildAuthUrl = () => {
    const state = generateState();
    const params = new URLSearchParams({
      client_id: STRAVA_CONFIG.CLIENT_ID,
      redirect_uri: STRAVA_CONFIG.REDIRECT_URI,
      response_type: 'code',
      approval_prompt: 'auto',
      scope: STRAVA_CONFIG.SCOPE,
      state: state
    });
    
    return `${STRAVA_CONFIG.AUTH_BASE_URL}?${params.toString()}`;
  };

  // Extract authorization code from URL
  const extractCodeFromUrl = (url) => {
    try {
      const urlObj = new URL(url);
      const code = urlObj.searchParams.get('code');
      const state = urlObj.searchParams.get('state');
      const error = urlObj.searchParams.get('error');
      
      return { code, state, error };
    } catch (e) {
      console.error('Error parsing callback URL:', e);
      return { code: null, state: null, error: 'invalid_url' };
    }
  };

  // Exchange authorization code for access token
  const exchangeCodeForToken = async (code) => {
    try {
      setIsExchangingToken(true);
      
      const response = await fetch(STRAVA_CONFIG.TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          client_id: STRAVA_CONFIG.CLIENT_ID,
          client_secret: STRAVA_CONFIG.CLIENT_SECRET,
          code: code,
          grant_type: 'authorization_code'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      if (data.access_token) {
        // Return the complete token data including athlete info
        return {
          success: true,
          tokens: {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_at: data.expires_at,
            expires_in: data.expires_in,
            token_type: data.token_type || 'Bearer'
          },
          athlete: data.athlete
        };
      } else {
        throw new Error('No access token received from Strava');
      }
    } catch (error) {
      console.error('Token exchange error:', error);
      return {
        success: false,
        error: error.message || 'Failed to exchange authorization code for token'
      };
    } finally {
      setIsExchangingToken(false);
    }
  };

  // Handle navigation state changes in WebView
  const handleNavigationStateChange = async (navState) => {
    const { url } = navState;
    console.log('Navigation state changed:', url);

    // Check if this is our callback URL (support both http and https)
    if (url.startsWith('http://localhost/callback') || url.startsWith('https://localhost/callback')) {
      console.log('Callback URL detected, stopping WebView and processing...');
      
      // Stop the WebView from loading
      if (webViewRef.current) {
        webViewRef.current.stopLoading();
      }

      const { code, error } = extractCodeFromUrl(url);

      if (error) {
        const errorMessage = error === 'access_denied' 
          ? 'Toegang geweigerd door gebruiker' 
          : `Strava autorisatie fout: ${error}`;
        
        setAuthError(errorMessage);
        if (onError) {
          onError(errorMessage);
        }
        return;
      }

      if (code) {
        console.log('Authorization code received, exchanging for token...');
        
        const result = await exchangeCodeForToken(code);
        
        if (result.success) {
          console.log('Token exchange successful:', result.athlete?.firstname || 'Unknown athlete');
          if (onSuccess) {
            onSuccess(result.tokens, result.athlete);
          }
        } else {
          setAuthError(result.error);
          if (onError) {
            onError(result.error);
          }
        }
      } else {
        const errorMsg = 'Geen autorisatiecode ontvangen van Strava';
        setAuthError(errorMsg);
        if (onError) {
          onError(errorMsg);
        }
      }
    }
  };

  // Handle WebView loading events
  const handleLoadStart = () => {
    setIsLoading(true);
    setAuthError(null);
  };

  const handleLoadEnd = () => {
    setIsLoading(false);
  };

  const handleLoadError = (syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    console.error('WebView load error:', nativeEvent);
    
    const errorMsg = `Kan Strava niet laden: ${nativeEvent.description || 'Onbekende fout'}`;
    setAuthError(errorMsg);
    setIsLoading(false);
    
    if (onError) {
      onError(errorMsg);
    }
  };

  // Retry authentication
  const handleRetry = () => {
    setAuthError(null);
    setIsLoading(true);
    
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  // Cancel authentication
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleCancel}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            disabled={isExchangingToken}
          >
            <Ionicons name="close" size={24} color={Colors.gray[900]} />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <Ionicons name="bicycle" size={24} color="#FC4C02" />
            <Typography variant="h6" color="text.primary" style={styles.headerTitle}>
              Verbinden met Strava
            </Typography>
          </View>
          
          <View style={styles.placeholder} />
        </View>

        {/* Loading indicator */}
        {(isLoading || isExchangingToken) && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FC4C02" />
            <Typography variant="body2" color="text.secondary" style={styles.loadingText}>
              {isExchangingToken ? 'Tokens ophalen...' : 'Strava laden...'}
            </Typography>
          </View>
        )}

        {/* Error state */}
        {authError && (
          <View style={styles.errorContainer}>
            <View style={styles.errorContent}>
              <Ionicons name="alert-circle" size={48} color={Colors.error[500]} />
              <Typography variant="h6" color="error" style={styles.errorTitle}>
                Autorisatie Mislukt
              </Typography>
              <Typography variant="body2" color="text.secondary" style={styles.errorMessage}>
                {authError}
              </Typography>
              
              <View style={styles.errorButtons}>
                <Button
                  title="Probeer Opnieuw"
                  onPress={handleRetry}
                  variant="outlined"
                  style={styles.retryButton}
                />
                <Button
                  title="Annuleren"
                  onPress={handleCancel}
                  variant="text"
                  style={styles.cancelActionButton}
                />
              </View>
            </View>
          </View>
        )}

        {/* WebView */}
        {!authError && !isLoading && !isExchangingToken && (
          <WebView
            ref={webViewRef}
            source={{ uri: buildAuthUrl() }}
            style={styles.webView}
            onLoadStart={handleLoadStart}
            onLoadEnd={handleLoadEnd}
            onError={handleLoadError}
            onNavigationStateChange={handleNavigationStateChange}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            scalesPageToFit={true}
            originWhitelist={['*']}
            userAgent="Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36"
            mixedContentMode="compatibility"
            thirdPartyCookiesEnabled={true}
            sharedCookiesEnabled={true}
          />
        )}

        {/* Instructions */}
        <View style={styles.instructions}>
          <Typography variant="caption" color="text.secondary" style={styles.instructionText}>
            Log in met je Strava account om je activiteiten te synchroniseren.
            Je wordt na autorisatie automatisch teruggeleid naar de app.
          </Typography>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary[500],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingTop: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[300],
    backgroundColor: Colors.primary[500],
  },
  cancelButton: {
    padding: Spacing.xs,
    borderRadius: 20,
    backgroundColor: Colors.secondary[500],
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    marginLeft: Spacing.sm,
  },
  placeholder: {
    width: 40,
  },
  webView: {
    flex: 1,
  },
  webViewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primary[500],
  },
  loadingContainer: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: Spacing.lg,
  },
  loadingText: {
    marginTop: Spacing.sm,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  errorContent: {
    alignItems: 'center',
    maxWidth: 300,
  },
  errorTitle: {
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  errorMessage: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  errorButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  retryButton: {
    marginRight: Spacing.sm,
    backgroundColor: '#FC4C02',
  },
  cancelActionButton: {
    marginLeft: Spacing.sm,
  },
  instructions: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.secondary[500],
    borderTopWidth: 1,
    borderTopColor: Colors.gray[300],
  },
  instructionText: {
    textAlign: 'center',
    lineHeight: 16,
  },
  placeholderView: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  placeholderText: {
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  placeholderDescription: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  placeholderButton: {
    minWidth: 200,
  },
});

export default StravaAuthWebView;