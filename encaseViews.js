"use strict";

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

class EncasedView {
  constructor (component, descriptor, descriptorDistance, index, easing, interpolationMaps){

    this._locationMap = interpolationMaps.location;
    this._scaleMap = interpolationMaps.scale;
    this._opacityMap = interpolationMaps.opacity;
    this._descriptorOpacityMap = interpolationMaps.descriptorOpacity;
    this._location = new Animated.ValueXY({x: 0, y:0});
    this._scale = new Animated.ValueXY({x: 0, y:0});
    this._opacity = new Animated.Value(0);

    let componentPositionAdjustment = new Animated.ValueXY({x: 0, y:0});

    // interpolated properties
    let transX;
    let transY;

    let scaleX;
    let scaleY;

    let opa;
    let descOpa;

    transX = this._location.x.interpolate({
      inputRange: this._locationMap.inputRange,
      outputRange: this._locationMap.x.outputRange
    });
    transY = this._location.y.interpolate({
      inputRange: this._locationMap.inputRange,
      outputRange: this._locationMap.y.outputRange
    });
    scaleX = this._scale.x.interpolate({
      inputRange: this._scaleMap.inputRange,
      outputRange: this._scaleMap.x.outputRange
    });
    scaleY = this._scale.y.interpolate({
      inputRange: this._scaleMap.inputRange,
      outputRange: this._scaleMap.x.outputRange
    });
    opa = this._opacity.interpolate({
      inputRange: this._opacityMap.inputRange,
      outputRange: this._opacityMap.opacity.outputRange
    });

    descOpa = this._opacity.interpolate({
      inputRange: this._descriptorOpacityMap.inputRange,
      outputRange: this._descriptorOpacityMap.opacity.outputRange
    });
    let key = uuid.v4();

    let viewComponent = (
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
                {translateY: Animated.add(componentPositionAdjustment.y, descriptorDistance)},
                {translateX: componentPositionAdjustment.x}
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
            componentPositionAdjustment.setValue({x:0, y:(-layout.height/2-layout.y)})
          }
          }
          style={[
            {
              opacity: opa,
              alignItems: 'center', // centers along the x axis
              transform : [
                {translateY: componentPositionAdjustment.y},
                {translateX: componentPositionAdjustment.x}
              ]
            }
          ]}
        >
          { component }
        </Animated.View>
      </Animated.View>
    );

    this.component = component;
    this.descriptor = descriptor;
    this.viewComponent = viewComponent;

    this._index = index;
    this._currentIndex = 0;
    this._shownIndex = 0;
    this._easing = easing;
  }

  get locationState () {
    return this._location;
  }
  get scaleState () {
    this._scale;
  }
  get opacityState () {
    this._opacity;
  }

  get currentIndex () {
    return this._currentIndex;
  }
  set currentIndex (val) {
    this._currentIndex = val;
    return val;
  }
  get shownIndex () {
    return this._shownIndex;
  }
  set shownIndex (val) {
    this._shownIndex = val;
    this._location.setValue({x:val, y: val});
    this._scale.setValue({x: val, y: val});
    this._opacity.setValue(val);
    return val;
  }
  get index () {
    return this._index;
  }

  transition (moveTo, duration = 1000) {
    let animations = [];

    let animSettings = {
      fromValue: this.currentIndex,
      toValue: moveTo,
      duration: duration,
      easing: this._easing
    };

    animations.push(Animated.timing(this._location.x, animSettings));
    animations.push(Animated.timing(this._location.y, animSettings));
    animations.push(Animated.timing(this._scale.x, animSettings));
    animations.push(Animated.timing(this._scale.y, animSettings));
    animations.push(Animated.timing(this._opacity, animSettings));

    return Animated.parallel(animations);
  }

  transitionTemp (moveTo) {
    this.shownIndex = moveTo;
  }
}

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

  let interpolationMaps = {
    location: interpolationLocationMap,
    scale: interpolationScaleMap,
    opacity: interpolationOpacityMap,
    descriptorOpacity: interpolationDescriptorOpacityMap
  };

  let encasedItems = items.map( (component, index) => {

    let descriptor = ( descriptors && descriptors.length > index ? descriptors[index] : null );


    return new EncasedView(component, descriptor, state.descriptorDistance, index, state._easing, interpolationMaps);
  });

  return encasedItems;
};