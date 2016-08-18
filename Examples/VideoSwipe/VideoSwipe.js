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
  StatusBar
} from 'react-native';

import VideoCard from './VideoCard';
import SwipeSelector from 'react-native-swipe-selector'

export default class VideoSwipe extends Component {
  constructor(props) {
    super(props);

    this.state = {
      currentIndex: 0
    };

    this.cards = [];
  }

  componentDidMount() {
    this.cards[0].start();
  }

  render() {
    return (
      <View style={styles.container}>
        <StatusBar hidden={true} />
        <SwipeSelector
          defaultIndex={this.state.currentIndex}
          onChange={this.changeIndex.bind(this)}
          simpleScrollDistance={200}
        >
          <VideoCard ref={(e) => {this.cards[0] = e}} id="0" videoId="destroyallplanets"/>
          <VideoCard ref={(e) => {this.cards[1] = e}} id="1" videoId="destinationmoon"/>
          <VideoCard ref={(e) => {this.cards[2] = e}} id="2" videoId="moonbeast"/>
          <VideoCard ref={(e) => {this.cards[3] = e}} id="3" videoId="giantleeches"/>
        </SwipeSelector>
      </View>
    )
  }

  changeIndex ({index: index}) {
    this.cards[this.state.currentIndex].pause();
    this.setState({currentIndex: index},
                  () => {
                    this.cards[this.state.currentIndex].play()
                  })
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'black'
  },
  transparentView: {
    backgroundColor: '#00000000'
  }
});