import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  View
} from 'react-native';
import Video from 'react-native-video'

export default class VideoSwipe extends Component {

  render() {
    return (
      <View style={styles.container}>
        <Text>sup</Text>
        <Video
          source={require('./broadchurch.mp4')}
          rate={1.0}                   // 0 is paused, 1 is normal.
          volume={1.0}                 // 0 is muted, 1 is normal.
          muted={false}                // Mutes the audio entirely.
          paused={false}               // Pauses playback entirely.
          resizeMode="cover"           // Fill the whole screen at aspect ratio.
          repeat={true}                // Repeat forever.
          playInBackground={false}     // Audio continues to play when aentering background.
          playWhenInactive={false}     // [iOS] Video continues to play whcontrol or notification center are shown.
          onEnd={() => { AlertIOS.alert('Done!') }}
          style={{position:'absolute', top: 0, left: 0, height: 500, width: 200}}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
});