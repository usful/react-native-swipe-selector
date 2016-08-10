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
  View,
  TouchableHighlight
} from 'react-native';
import SwipeSelector from 'react-native-swipe-selector';

class ExampleSwipe extends Component {

  constructor(props) {
    super(props);
    this.state = {
      num: 0
    };
    this.elements = [
      <Text key="1" id="1">This is a string</Text>,
      <Text key="2" id="2">Perhaps another string?</Text>,
      <Text key="3" id="3">Last string</Text>,
    ];
  }

  render() {

    let elements = [].concat(this.elements).concat(
      [
        <TouchableHighlight key="4" id="4"
                                                                         onPress={() => {
                                                                           this.elements.sort(() => 0.5 - Math.random());
                                                                           this.setState({});
                                                                         }}
        >
          <Text>Click Me!</Text>
        </TouchableHighlight>,
        <Text key="5" id="5">Current: {this.state.num}</Text>
      ]);

    return (
      <View style={styles.container}>
        <SwipeSelector onChange={
                    ({index:index}) => {
                      this.setState({num: index})
                    }}>
          {elements}
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
