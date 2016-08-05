"use strict"

import React from 'react';
import { calculateInterpolationMap, calculate2DInterpolationMap, interpolationWindow} from './calculateInterpolationMap'
import uuid from 'uuid';
import {Animated, StyleSheet} from 'react-native';

const styles = StyleSheet.create({
  itemViewStyle: {
    height: 0,
    position:'relative'
  }
});

const _prepBounds = function (centerVal, leftVal, rightVal, padLeft, padRight,
                              interpolate, interpolateDepth, vanishingGap) {
  return {
    center: { ...centerVal },
    left: {
      ...leftVal,
      padPoints: padLeft,
      interpolate: interpolate,
      interpolateDepth: interpolateDepth,
      vanishingGap: vanishingGap
    },
    right: {
      ...rightVal,
      padPoints: padRight,
      interpolate: interpolate,
      interpolateDepth: interpolateDepth,
      vanishingGap: vanishingGap
    },
    hidden: {
      interpolate: interpolate,
      interpolateDepth: interpolateDepth
    }
  }
};

export default function encaseViews (state, items, descriptors) {

  if (!Array.isArray(items)) items = [items];

  let interpolationLocationMap = calculate2DInterpolationMap(
    _prepBounds(
      {x:0, y:0},
      state.leftPoint,
      state.rightPoint,
      state.scalingOptions.padLeftItems,
      state.scalingOptions.padRightItems,
      state.scalingOptions.locationScaling,
      state.scalingOptions.locationScalingDepth,
      state.scalingOptions.vanishingGap
    ),
    state.rightCount,
    state.leftCount,
    state.hideCount
  );

  let interpolationScaleMap = calculate2DInterpolationMap(
    _prepBounds(
      {x:1, y:1},
      {x:0, y:0},
      {x:0, y:0},
      state.scalingOptions.padLeftItems,
      state.scalingOptions.padRightItems,
      state.scalingOptions.sizeScaling,
      state.scalingOptions.sizeScalingDepth,
      state.scalingOptions.vanishingGap,
    ),
    state.rightCount,
    state.leftCount,
    state.hideCount
  );

  let interpolationOpacityMap = calculateInterpolationMap(
    _prepBounds(
      {opacity: 1},
      {opacity: 0.5},
      {opacity:0.5},
      state.scalingOptions.padLeftItems,
      state.scalingOptions.padRightItems,
      state.scalingOptions.sizeScaling,
      state.scalingOptions.sizeScalingDepth,
      state.scalingOptions.vanishingGap,
    ),
    state.rightCount,
    state.leftCount,
    state.hideCount,
    'opacity'
  );

  let interpolationDescriptorOpacityMap = interpolationWindow(
    interpolationOpacityMap.opacity.inputRange,
    interpolationOpacityMap.opacity.outputRange,
    {
      default: 0,
      range: [
        { start: 0, end: 1 },
        { start: state.children.length - 1, end: state.children.length }
      ]
    },
    'opacity'
  );


  let encasedItems = items.map( (component, index) => {
    let location = new Animated.ValueXY({x: 0, y:0}); // default to center at {x:0, y:0}
    let scale = new Animated.ValueXY({x: 0, y:0}); // default to {x: 1, y: 1}
    let opacity = new Animated.Value(0); // default to full opacity

    let transX = {};
    let transY = {};

    let scaleX = {};
    let scaleY = {};

    let opa = {};
    let descOpa = {};

    // These values are used to center the images and descriptors
    let _adjustComponentPosition = new Animated.ValueXY({x :0, y:0});

    transX = location.x.interpolate({
      inputRange: interpolationLocationMap.inputRange,
      outputRange: interpolationLocationMap.x.outputRange
    });
    transY = location.y.interpolate({
      inputRange: interpolationLocationMap.inputRange,
      outputRange: interpolationLocationMap.y.outputRange
    });
    scaleX = scale.x.interpolate({
      inputRange: interpolationScaleMap.inputRange,
      outputRange: interpolationScaleMap.x.outputRange
    });
    scaleY = scale.y.interpolate({
      inputRange: interpolationScaleMap.inputRange,
      outputRange: interpolationScaleMap.x.outputRange
    });
    opa = opacity.interpolate({
      inputRange: interpolationOpacityMap.inputRange,
      outputRange: interpolationOpacityMap.opacity.outputRange
    });
    descOpa = opacity.interpolate({
      inputRange: interpolationDescriptorOpacityMap.inputRange,
      outputRange: interpolationDescriptorOpacityMap.opacity.outputRange
    });

    let key = uuid.v4();
    let descriptor = ( descriptors && descriptors.length > index ? descriptors[index] : null );
    let viewComponent =
      <Animated.View
        key={key}
        style={[ styles.itemViewStyle,
          {
            transform : [
              {translateX: transX},
              {translateY: transY},
              {scaleX: scaleX},
              {scaleY: scaleY}
            ]
          }
        ]}
      >
        <Animated.View
          style={[
            {
              opacity: descOpa,
              transform: [
                {translateY: Animated.add(_adjustComponentPosition.y, state.descriptorDistance)}
              ]
            }
          ]}
        >
          { descriptor ? <Text style={{textAlign:'center'}}>{descriptor}</Text> : null}
        </Animated.View>
        <Animated.View
          onLayout={(e) => {
            // center the components
            let layout = e.nativeEvent.layout;
            _adjustComponentPosition.setValue({x:0, y:(-layout.height/2-layout.y)})
          }
          }
          style={[
            {
              opacity: opa,
              alignItems: 'center', // centers along the x axis
              transform : [
                {translateY: _adjustComponentPosition.y}
              ]
            }
          ]}
        >
          { component }
        </Animated.View>
      </Animated.View>;

    let obj = {
      component: component,
      descriptor: descriptor,
      viewComponent: viewComponent,
      location: location,
      scale: scale,
      opacity: opacity,
      index: index,
      _easing: state.easing,
      _adjustComponentPosition: _adjustComponentPosition,
      _shownIndex: 0, // Represents where the item appears to be
      get shownIndex () {
        return this._shownIndex;
      },
      set shownIndex (val) {
        this._shownIndex = val;
        this.location.setValue({x: val, y: val});
        this.scale.setValue({x: val, y: val});
        this.opacity.setValue(val);
        return val;
      },
      _currentIndex: 0, // Represents where the item actually is (during a scroll this doesn't change)
      get currentIndex () {
        return this._currentIndex;
      },
      set currentIndex (val) {
        this._currentIndex = val;
        this.shownIndex = val;
        return val;
      },
      transition: function (moveTo, duration = 1000) {
        let animations = [];

        animations.push(Animated.timing(
          this.location.x,
          {
            fromValue: this.currentIndex,
            toValue: moveTo,
            duration: duration,
            easing: this._easing
          }
          )
        );
        animations.push(Animated.timing(
          this.location.y,
          {
            fromValue: this.currentIndex,
            toValue: moveTo,
            duration: duration,
            easing: this._easing
          }
          )
        );
        animations.push(Animated.timing(
          this.scale.x,
          {
            fromValue: this.currentIndex,
            toValue: moveTo,
            duration: duration,
            easing: this._easing
          }
          )
        );
        animations.push(Animated.timing(
          this.scale.y,
          {
            fromValue: this.currentIndex,
            toValue: moveTo,
            duration: duration,
            easing: this._easing
          }
          )
        );
        animations.push(Animated.timing(
          this.opacity,
          {
            fromValue: this._currentIndex,
            toValue: moveTo,
            duration: duration,
            easing: this._easing
          }
          )
        );

        return Animated.parallel(animations);
      },
      transitionTemp: function (moveTo) {
        this.shownIndex = moveTo;
      }
    };
    return obj;
  });

  return encasedItems;
};