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

/**
 * @name Bounds
 * @type {
 *        {
 *          center: { x: number, y: number }
 *          left  : { x: number, y: number, padPoints: number, interpolate: function, interpolateDepth: number, vanishingGap: number}
 *          right : { x: number, y: number, padPoints: number, interpolate: function, interpolateDepth: number, vanishingGap: number}
 *          hidden: { interpolate: function, interpolateDepth: number }
 *        }
 *       }
 */

/**
 * Prepares a Bounds object to be used to create an interpolation map
 * @param {Vector} centerVal
 * @param {Vector} leftVal
 * @param {Vector} rightVal
 * @param {number} padLeft
 * @param {number} padRight
 * @param {function} interpolate
 * @param {number} interpolateDepth
 * @param {number} vanishingGap
 * @returns {Bounds}
 * @private
 */
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
  constructor (component, descriptor, descriptorDistance, index, easing, interpolationMaps, centrePoint, onTap){

    this._locationMap = interpolationMaps.location;
    this._scaleMap = interpolationMaps.scale;
    this._opacityMap = interpolationMaps.opacity;
    this._descriptorOpacityMap = interpolationMaps.descriptorOpacity;
    this._location = new Animated.ValueXY({x: 0, y:0});
    this._scale = new Animated.ValueXY({x: 0, y:0});
    this._scaleMultiplier = new Animated.Value(1);
    this._opacity = new Animated.Value(0);

    this._onTap = onTap;

    this._panResponder = PanResponder.create({
      onStartShouldSetPanResponderCapture: (e, gestureState) => {
        // Should grab the responder if it's not the current responder
        return (this.currentIndex !== 0);
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
        // Do nothing
      },

      onPanResponderEnd: (e, gestureState) => {
        // If control is still here, then the parent view never took it away
        // Successful tap
        if (this._onTap) this._onTap(this);
      },

      onPanResponderMove: (e, gestureState) => {
        // Do Nothing

      },

      onPanResponderTerminationRequest: (e, {dx: dx, dy: dy}) => {
        // Release the responder if we've moved more than 5 px (box) away from initial location
        return (Math.abs(dx) > 5 || Math.abs(dy) > 5);
      },

      onPanResponderTerminate: (e, gestureState) => {
        // Do nothing
      }
    });

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

  /**
   * Returns the component wrapped in a view with all animated values bounds using
   *  this instances data
   * @returns {XML}
   * @private
   */
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
              backgroundColor: "rgba(0,0,0,0)"
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

  /**
   * The animated value representing the state of the location animation
   * @returns {Animated.ValueXY}
   */
  get locationState () {
    return this._location;
  }

  /**
   * The animated value representing the state of the scale animation
   * @returns {Animated.ValueXY}
   */
  get scaleState () {
    return this._scale;
  }

  /**
   * The animated value representing the state of the opacity animation
   * @returns {Animated.Value}
   */
  get opacityState () {
    return this._opacity;
  }

  /**
   * The current position of the component in the circle. Should always be an integer.
   * @returns {number}
   */
  get currentIndex () {
    return this._currentIndex;
  }

  /**
   * The current position of the component in the circle. Should always be an integer.
   * @param {number} val
   */
  set currentIndex (val) {
    if (val%1 !== 0)
      throw new Error(`Expected integer argument, received ${val} instead`);
    this._currentIndex = val;
    return val;
  }

  /**
   * The position at which the component is currently animated. May not be correct during the middle of an animation.
   * @returns {number}
   */
  get shownIndex () {
    return this._shownIndex;
  }

  /**
   * The position at which the component is currently animated. May not be correct during the middle of an animation.
   * @param {number} val
   */
  set shownIndex (val) {
    this._shownIndex = val;
    this._location.setValue({x:val, y: val});
    this._scale.setValue({x: val, y: val});
    this._opacity.setValue(val);
    return val;
  }

  /**
   * The index of the component in the original array
   * @returns {number}
   */
  get index () {
    return this._index;
  }

  /**
   * The key of the enclosing view
   * @returns {string}
   */
  get key() {
    return this._key;
  }

  /**
   * The child component contained inside the view
   * @returns {XML}
   */
  get component () {
    return this._component;
  }

  /**
   * The child component contained inside the view
   * @param {XML} val
   */
  set component (val) {
    this._component = val;
    this._viewComponent = this._generateViewComponent();
    return val;
  }

  /**
   * The descriptor attached to the view
   * @returns {string}
   */
  get descriptor () {
    return this._descriptor;
  }

  /**
   * The descriptor attached to the view
   * @param {string} val
   */
  set descriptor (val) {
    this._descriptor = val;
    this._viewComponent = this._generateViewComponent();
    return val;
  }

  /**
   * The enclosing view, with the component wrapped inside
   * @returns {XML}
   */
  get viewComponent () {
    return this._viewComponent;
  }

  /**
   * Returns an animation to shrink the view to scaling of 0
   * @param {number} [duration=500]
   * @returns {CompositeAnimation}
   */
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

  /**
   * Returns an animation to restore the view to scaling of 1
   * @param {number} [duration=500]
   * @returns {CompositeAnimation}
   */
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

  /**
   * Returns an animation to move the view from its current location to the indicated location
   * @param {number} moveTo The position to move to
   * @param {number} [duration=500]
   */
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

/**
 * Takes a given state object, children, descriptors, centre
 * @param {Object} state
 * @param {[XML]} children
 * @param {[string]} [descriptors]
 * @param {Vector} [centrePoint={x:0, y:0}]
 * @param {function} [onTap]
 * @returns {[EncasedView]}
 */
function encaseViews (state, children, descriptors, centrePoint = {x:0, y:0}, onTap) {

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

    return new EncasedView(component, descriptor, state.descriptorDistance, index, state._easing, interpolationMaps, centrePoint, onTap);
  });

  return encasedItems;
}

export { encaseViews as default, EncasedView };