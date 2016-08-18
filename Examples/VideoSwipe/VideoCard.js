'use strict';
import React, {
  Component
} from 'react';

import {
  AlertIOS,
  AppRegistry,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import Video from 'react-native-video';

export default class VideoCard extends Component {
  constructor(props) {
    super(props);

    this.state = {
      rate: 1,
      volume: 1,
      muted: false,
      resizeMode: 'contain',
      paused: true,
      skin: 'embed'
    };
  }

  render() {
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={() => {this.setState({paused: !this.state.paused}); }}>
        <View style={styles.container}>
          <View style={styles.fullScreen}>
            <Video
              ref={(e) => this.card = e}
              source={{uri: this.props.videoId}}
              style={styles.nativeVideoControls}
              rate={this.state.rate}
              paused={this.state.paused}
              volume={this.state.volume}
              muted={this.state.muted}
              resizeMode={this.state.resizeMode}
              repeat={true}
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  start() {
    this.card.seek(0);
    this.setState({paused: false});
  }
  stop() {
    this.card.seek(0);
    this.setState({paused: true})
  }
  play() {
    this.setState({paused: false})
  }
  pause() {
    this.setState({paused: true})
  }
}

const styles = StyleSheet.create({
  // Width and height need to be set directly on the main container and the video component
  // Need to set on the video, because RNVideo doesn't report the height of the video so need to manually set it
  // Need to set on the main container, because the video doesn't report the height, so the view can't resize appropriately
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
    width: 400,
    height: 300
  },
  fullScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  nativeVideoControls: {
    height: 300,
    width: 400
  }
});