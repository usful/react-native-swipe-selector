import React, { Component } from 'react';
import {
  StatusBar,
  StyleSheet,
  Text,
  View,
  TouchableHighlight
} from 'react-native';
import SwipeSelector from 'react-native-swipe-selector';

export default class ExampleSwipe extends Component {

  constructor(props) {
    super(props);
    this.state = {
      num: 0
    };
    this.elements = [
      <View style={styles.transparentView} key="1" id="1" descriptor="A String!"><Text>This is a string</Text></View>,
      <View style={styles.transparentView} key="2" id="2"><Text >Perhaps another string?</Text></View>,
      <View style={styles.transparentView} key="3" id="3"><Text>Last string</Text></View>,
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
                            style={styles.transparentView}
        >
          <Text>Click Me!</Text>
        </TouchableHighlight>,
        <View style={styles.transparentView} key="5" id="5"><Text>Current: {this.state.num}</Text></View>
      ]);

    return (
      <View style={styles.container}>
        <StatusBar hidden={true} />
        <SwipeSelector onChange={
                                  ({index:index}) => {
                                    this.setState({num: index})
                                  }
                                }
                       leftPoint= {{x: -150, y: -50}}
                       rightPoint= {{x: 150, y: -50}}
                       scalingOptions={{padRightItems: 1, padLeftItems: 1}}
        >
          {elements}
        </SwipeSelector>
        <SwipeSelector onChange={
                                  ({index:index}) => {
                                    this.setState({num: index})
                                  }
                                }
                       leftPoint= {{x: -150, y: 50}}
                       rightPoint= {{x: 150, y: 50}}
                       scalingOptions={{padRightItems: 1, padLeftItems: 1}}
        >
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
    backgroundColor: '#F5FCFF'
  },
  transparentView: {
    backgroundColor: '#00000000'
  }
});