"use strict";

import React from 'react';
import { calculateInterpolationMap, calculate2DInterpolationMap, interpolationWindow} from './calculateInterpolationMap'
import uuid from 'uuid';
import {Animated, Easing, PanResponder, StyleSheet, Text} from 'react-native';

const styles = StyleSheet.create({
  itemViewStyle: {
    position: 'absolute',
    top: 0,
    left: 0
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
  constructor (component, descriptor, descriptorDistance, index, easing, interpolationMaps, centrePoint){

    this._locationMap = interpolationMaps.location;
    this._scaleMap = interpolationMaps.scale;
    this._opacityMap = interpolationMaps.opacity;
    this._descriptorOpacityMap = interpolationMaps.descriptorOpacity;
    this._location = new Animated.ValueXY({x: 0, y:0});
    this._scale = new Animated.ValueXY({x: 0, y:0});
    this._scaleMultiplier = new Animated.Value(1);
    this._opacity = new Animated.Value(0);

    this._tapStore = {
      height: 0,
      width: 0,
      pageLocationStart: { x:0, y:0 },
      locationStart: { x:0, y:0 }
    };
    this._panResponder = PanResponder.create({
      onStartShouldSetPanResponderCapture: (e, gestureState) => {
        // Should grab the responder if it's not the current responder
        return false;//(this.currentIndex !== 0);
      },

      onMoveShouldSetPanResponderCapture: (e, gestureState) => {
        return false;
      },

      onStartShouldSetPanResponder: (e, gestureState) => {
        // If the event is starting in the component and it bubbles up, grab it
        return false;
      },

      onMoveShouldSetPanResponder: (e, gestureState) => {
        // Should not grab if interacting with something else
        return false;
      },

      onPanResponderGrant: (e, gestureState) => {
        // Do nothing, setup code is in onPanResponderStart
      },

      onPanResponderReject: (e, gestureState) => {
        // Do nothing
      },

      onPanResponderStart: (e, gestureState) => {
        this._tapStore.pageLocationStart = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
        this._tapStore.locationStart = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
      },

      onPanResponderEnd: (e, gestureState) => {
        // Check if you're still in the box, if you're still in the box, transition to it.

        // locationX and locationY does not update properly in Android
        //  need to calculate the final location of the touch manually

        let finalLocation = {
          x: this._tapStore.locationStart.x + ( e.nativeEvent.pageX - this._tapStore.pageLocationStart.x ),
          y: this._tapStore.locationStart.y + ( e.nativeEvent.pageY - this._tapStore.pageLocationStart.y )
        };

        if (finalLocation.x < 0
          || finalLocation.y < 0
          || finalLocation.x > this._tapStore.width
          || finalLocation.y > this._tapStore.height
        ) {
          // Tap was cancelled by moving out of the target component, do nothing
          return;
        }
        else {
          ;//console.log('inside tap');
        }
      },

      onPanResponderMove: (e, gestureState) => {
        // Do Nothing

      },

      onPanResponderTerminationRequest: (e, gestureState) => {
        // TODO: Release the responder if we've moved more than 5 px (box) away from initial location
        return false; // DO NOT RELEASE THE RESPONDER UNTIL WE ARE DONE
      },

      onPanResponderTerminate: (e, gestureState) => {
        // Do nothing
      }
    });
    this._tapStore = {
      height: 0,
      width: 0,
      pageLocationStart: { x:0, y:0 },
      locationStart: { x:0, y:0 }
    };

    this._globalPositionAdjustment = centrePoint;
    this._mainPositionAdjustment = new Animated.ValueXY({x: 0, y:0});
    this._componentHeight = new Animated.Value(0);
    this._descriptorHeight = new Animated.Value(0);
    this._descriptorDistanceHeight = new Animated.Value(0);

    this._key = uuid.v4();
    this._component = component;
    this._descriptor = descriptor;
    this._descriptorDistance = descriptorDistance;
    this._viewComponent = this._generateViewComponent();


    this._index = index;
    this._currentIndex = 0;
    this._shownIndex = 0;
    this._easing = easing;
  }

  _generateViewComponent () {
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

    let viewComponent = (
      <Animated.View
        { ...this._panResponder.panHandlers }
        key={this.key}
        onLayout={ ({nativeEvent: {layout : {width: width, height: height}}}) => {
          this._mainPositionAdjustment.x.setValue(-(width/2));
          this._mainPositionAdjustment.y.setValue(-(height/2));
          this._tapStore.height = height;
          this._tapStore.width = width;
        }}
        style={[ styles.itemViewStyle,
          {
            height: Animated.add(this._componentHeight, Animated.add(this._descriptorDistanceHeight, this._descriptorHeight)),
            transform : [
              {translateX: Animated.add(transX, Animated.add(this._mainPositionAdjustment.x, this._globalPositionAdjustment.x))},
              {translateY: Animated.add(transY, Animated.add(this._mainPositionAdjustment.y, this._globalPositionAdjustment.y))},
              {scaleX: Animated.multiply(scaleX, this._scaleMultiplier)},
              {scaleY: Animated.multiply(scaleY, this._scaleMultiplier)}
            ]
          }
        ]}
      >
        <Animated.View
          onLayout={ ({nativeEvent: {layout : {width: width, height: height}}}) => {
            this._descriptorHeight.setValue(height);
            this._descriptorDistanceHeight.setValue((height > 0 ? this._descriptorDistance : 0));
          }}
          style={[
            {
              opacity: descOpa,
            }
          ]}
        >
          { this.descriptor ? <Text style={{textAlign:'center'}}>{this.descriptor}</Text> : null}
        </Animated.View>
        <Animated.View
          onLayout={ ({nativeEvent: {layout : {width: width, height: height}}}) => {
            this._componentHeight.setValue(height);
          }}
          style={[
            {
              opacity: opa,
              transform : [
                {translateY: this._descriptorDistanceHeight}
              ]
            }
          ]}
        >
          { this.component }
        </Animated.View>
      </Animated.View>
    );

    return viewComponent;
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
  get key() {
    return this._key;
  }

  get component () {
    return this._component;
  }
  set component (val) {
    this._component = val;
    this._viewComponent = this._generateViewComponent();
    return val;
  }
  get descriptor () {
    return this._descriptor;
  }
  set descriptor (val) {
    this._descriptor = val;
    this._viewComponent = this._generateViewComponent();
    return val;
  }
  get viewComponent () {
    return this._viewComponent;
  }

  shrink (duration = 500) {
    return Animated.timing(
      this._scaleMultiplier,
      {
        toValue: 0,
        duration: duration,
        easing: Easing.linear
      }
    )
  }

  restore (duration = 500) {
    return Animated.timing(
      this._scaleMultiplier,
      {
        toValue: 1,
        duration: duration,
        easing: Easing.linear
      }
    )
  }

  transitionAnimation (moveTo, duration = 500) {
    let animations = [];

    let animSettings = {
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

}

export default function encaseViews (state, children, descriptors, centrePoint = {x:0, y:0}) {

  if (!Array.isArray(children)) children = [children];

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
        { start: children.length - 1, end: children.length }
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

  let encasedItems = children.map( (component, index) => {

    let descriptor = ( descriptors && descriptors.length > index ? descriptors[index] : null );

    return new EncasedView(component, descriptor, state.descriptorDistance, index, state._easing, interpolationMaps, centrePoint);
  });

  return encasedItems;
};
