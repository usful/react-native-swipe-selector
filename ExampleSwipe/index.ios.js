/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  View
} from 'react-native';
import SwipeSelector from 'react-native-swipe-selector';

class ExampleSwipe extends Component {
//   // <Text style={styles.welcome}>
//   //   Welcome to React Native!
//   // </Text>
//   // <Text style={styles.instructions}>
//   //   To get started, edit index.ios.js
//   // </Text>
// {/*<Text style={styles.instructions}>*/}
// {/*Press Cmd+R to reload,{'\n'}*/}
// {/*Cmd+D or shake for dev menu*/}
// {/*</Text>*/}
  constructor(props) {
    super(props);
    this.state = {
      num: 0
    }
  }
  render() {
    return (
      <View style={styles.container}>
        <SwipeSelector onChange={
                    ({index:index}) => this.setState({num: index})}>
          <Text id="1">Current: {this.state.num} This is a string</Text>
          <Text id="2">Current: {this.state.num} Perhaps another string?</Text>
          <Text id="3">Current: {this.state.num} Last string</Text>
        </SwipeSelector>

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

AppRegistry.registerComponent('ExampleSwipe', () => ExampleSwipe);
