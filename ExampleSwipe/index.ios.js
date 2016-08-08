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

  render() {
    return (
      <View style={styles.container}>
        <SwipeSelector>
          <Text>This is a string</Text>
          <Text>Perhaps another string?</Text>
          <Text>Last string</Text>
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
