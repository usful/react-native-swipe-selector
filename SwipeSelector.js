"use strict";

import React from 'react';
import { StyleSheet, Text, View, Animated, Easing, PanResponder, TouchableOpacity } from 'react-native';
import { bound, range, circularize } from './helpers';
import { scaleLinear, scaleLogarithmic, scaleSqrt } from './scalers'
import { calculateInterpolationMap, calculate2DInterpolationMap, interpolationWindow} from './calculateInterpolationMap'
import uuid from 'uuid';
import Vector from 'victor';

/**
 * Enumeration used to determine the scroll directions to be used for a SwipeSelector
 * @type {{}}
 * @private
 */
const _scrollDirections = {
  HORIZONTAL: 'horizontal', // scroll right increases index
  VERTICAL: 'vertical', // scroll down increases index
  ADAPTIVE: 'adaptive', // adapts the scroll axis to the direction of the vanishing points
  CUSTOM: 'custom' // custom scroll vector
};

/**
 *
 * @param { SwipeSelector.scrollDirections } scrollDirection
 * @param { {x: number, y: number} } [leftPoint={x: -1, y:0}]
 * @param { {x: number, y: number} } [rightPoint={x: 1, y: 0}]
 * @param { {x: number, y: number} } [customVector={x: 1, y: 0}]
 * @returns {*}
 * @private
 */
const _resolveScrollDirections = function(scrollDirection,
                                          leftPoint= {x: -1, y:0},
                                          rightPoint= {x: 1, y:0},
                                          customVector = {x: 1, y: 0} ) {
  switch(scrollDirection) {
    case _scrollDirections.HORIZONTAL:
      return Vector({x: 1, y: 0});
    case _scrollDirections.VERTICAL:
      return Vector({x: 0, y: -1});
    case _scrollDirections.ADAPTIVE:
      let left = Vector(fixPoints.leftPoint).norm();
      let right = Vector(fixPoints.rightPoint).norm();
      let axis = left.clone().add(right).rotateByDeg(-90).norm();
      return axis;
    case _scrollDirections.CUSTOM:
      return Vector(customVector).norm();
    default:
      return Vector({x: 1, y: 0});
  }
};

/**
 * Enumeration used to determine the particular type of scaling for animation
 * @type {{}}
 * @private
 */
const _scaling = {
  LINEAR: 'linear',
  LOGARITHMIC: 'logarithmic',
  SQRT: 'sqrt'
};

const _resolveScaling = function(scaling) {
  // Turns the option into a usable scaling function for the class
  switch (scaling) {
    case _scaling.LINEAR:
      return scaleLinear;
    case _scaling.LOGARITHMIC:
      return scaleLogarithmic;
    case _scaling.SQRT:
      return scaleSqrt;
    default:
      return scaleLinear;
  }
};

const _defaultScalingOptions = {
  sizeScaling: _scaling.LINEAR,
  sizeScalingDepth: 1,
  locationScaling: _scaling.LINEAR,
  locationScalingDepth: 1,
  opacityScaling: _scaling.LINEAR,
  opacityScalingDepth: 1,
  padRightItems: 0,
  padLeftItems: 0,
  vanishingGap: 0.25
};

const _defaultProps = {
  descriptorDistance: 20,
  descriptorAbove: true,
  leftPoint: {x: -150, y: 25},
  rightPoint: {x: 150, y: 25},
  scalingOptions: {
    ... _defaultScalingOptions
  },
  hide: false,
  show: 3,
  easing: Easing.ease,
  simpleScroll: true, // Simple scroll just measures the distance travelled
  simpleScrollDistance: 100,
  scrollDirection: _scrollDirections.HORIZONTAL,
  unitVector: null
};

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

const styles = StyleSheet.create({
  itemViewStyle: {
    height: 0,
    position:'relative'
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    margin: 10,
    backgroundColor: '#2B81B0'
  }
});

const _encaseViews = function (state, items, descriptors, attachInterpolation = true) {

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
                                  );


  // debugger;
  let encasedItems = items.map( (component, index) => {
    // let location = new Animated.ValueXY({x: 0, y:0}); // default to center at {x:0, y:0}
    // let scale = new Animated.ValueXY({x: 1, y:1}); // default to {x: 1, y: 1}
    // let opacity = new Animated.Value(1); // default to full opacity
    // let transX = {};
    // let transY = {};
    // let scaleX = {};
    // let scaleY = {};
    // let opa = {};
    // let descOpa = {};
    //
    // if (attachInterpolation) {
    //   transX = location.x.interpolate({
    //     inputRange: interpolationLocationMap.inputRange,
    //     outputRange: interpolationLocationMap.x.outputRange
    //   });
    //   transY = location.y.interpolate({
    //     inputRange: interpolationLocationMap.inputRange,
    //     outputRange: interpolationLocationMap.y.outputRange
    //   });
    //   scaleX = scale.x.interpolate({
    //     inputRange: interpolationScaleMap.inputRange,
    //     outputRange: interpolationScaleMap.x.outputRange
    //   });
    //   scaleY = scale.y.interpolate({
    //     inputRange: interpolationScaleMap.inputRange,
    //     outputRange: interpolationScaleMap.x.outputRange
    //   });
    //   opa = opacity.interpolate({
    //     inputRange: interpolationOpacityMap.inputRange,
    //     outputRange: interpolationOpacityMap.x.outputRange
    //   });
    //   descOpa = opacity.interpolate({
    //     inputRange: interpolationDescriptorOpacityMap.inputRange,
    //     outputRange: interpolationDescriptorOpacityMap.x.outputRange
    //   });
    // }
    //
    // else {
    //   transX = location.x;
    //   transY = location.y;
    //   scaleX = scale.x;
    //   scaleY = scale.y;
    //   opa = opacity;
    //   descOpa = opacity;
    // }

    // These values are used to center the images and descriptors
    // let _adjustComponentPosition = new Animated.ValueXY({x :0, y:0});

    let key = uuid.v4();
    let descriptor = ( descriptors && descriptors.length > index ? descriptors[index] : null );
    // let viewComponent = <Animated.View
    //   key={key}
    //   style={[ styles.itemViewStyle,
    //     {
    //       transform : [
    //         {translateX: transX},
    //         {translateY: transY},
    //         {scaleX: scaleX},
    //         {scaleY: scaleY}
    //       ]
    //     }
    //   ]}
    // >
    //   <Animated.View
    //     style={[
    //       {
    //         opacity: descOpa,
    //         transform: [
    //           {translateY: Animated.add(_adjustComponentPosition.y, -this.state.descriptorDistance)}
    //         ]
    //       }
    //     ]}
    //   >
    //     { descriptor ? <Text style={{textAlign:'center'}}>{descriptor}</Text> : null}
    //   </Animated.View>
    //   <Animated.View
    //     onLayout={(e) => {
    //       // center the images over
    //       let layout = e.nativeEvent.layout;
    //       _adjustComponentPosition.setValue({x:0, y:(-layout.height/2-layout.y)})
    //     }
    //     }
    //     style={[
    //       {
    //         opacity: opa,
    //         alignItems: 'center', // centers along the x axis
    //         transform : [
    //           {translateY: _adjustComponentPosition.y}
    //         ]
    //       }
    //     ]}
    //   >
    //     { component }
      {/*</Animated.View>*/}
    {/*</Animated.View>;*/}

    return {
      component: component,
      descriptor: descriptor,
      viewComponent: component,
      location: location,
      scale: scale,
      opacity: opacity,
      index: index,
      _easing: this.state.easing,
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
  });

  return encasedItems;
};

class SwipeSelector extends React.Component {
  //TODO: Adaptive unit vector
  //TODO: Tracking Scrolling
  //TODO: Flicking
  //TODO: Hidden Arm
  //TODO: Non-static collections (collect and create)
  //TODO: Use the children properties
  //TODO: Dynamically resize view to fit components?

  // Static class props

  /**
   * Enumeration used to determine the scroll directions to be used for a SwipeSelector
   * @type {{}}
   */
  static scrollDirections = _scrollDirections;

  /**
   * Enumeration used to determine the particular type of scaling for animation
   * Scaling may be applied to size scaling, location, or opacity.
   * @type {{}}
   */
  static scaling = _scaling;

  static defaultProps = {
    ... _defaultProps
  };
  
  static defaultScalingOptions = {
    ... _defaultScalingOptions
  };

  // TODO: move to outside the class
  static propsToState(props, currentIndex = 0, shownIndex = 0, attachResponders = false) {

    let children = React.Children.toArray(props.children);

    let shownCount = (props.hide) ? bound(children.length, {lower: 0, upper: props.show}) :  children.length;
    let hideCount = (props.hide) ? max(children.length-props.show, 0) : 0;

    let state = {
      children: children,
      items: null,
      descriptors: children.map( el => ( el.props.descriptor || '' )),
      descriptorDistance: props.descriptorDistance,
      descriptorAbove: props.descriptorAbove,
      leftPoint: props.leftPoint,
      rightPoint: props.rightPoint,
      currentIndex: currentIndex,
      shownIndex: shownIndex,
      leftCount: Math.floor( ( shownCount -1 ) /2 ),
      rightCount: Math.ceil( ( shownCount -1 ) /2 ),
      hideCount: hideCount,
      unitVector: null, // resolved to a value below
      scrollDistance: 0, // resolved to a value below
      easing: props.easing,
      scrollDirection: props.scrollDirection,
      scalingOptions: {
        ... SwipeSelector.defaultScalingOptions,
        ... props.scalingOptions
      }
    };
    
    state.scalingOptions.vanishingGap = bound(state.scalingOptions.vanishingGap, {lower: 0, upper: 0.45});
    state.scalingOptions.sizeScaling = _resolveScaling(state.scalingOptions.sizeScaling);
    state.scalingOptions.locationScaling = _resolveScaling(state.scalingOptions.locationScaling);
    state.scalingOptions.opacityScaling = _resolveScaling(state.scalingOptions.opacityScaling);

    state.unitVector = _resolveScrollDirections(state.scrollDirection);

    if (props.simpleScroll) {
      state.scrollDistance = props.simpleScrollDistance
    }
    else {
      // TODO: This should be the distance between the center and the adjacent (right) index
      state.scrollDistance = props.simpleScrollDistance;
    }

    state.children = _encaseViews(state, state.children, state.descriptors);

    return state;
  }

  constructor (props) {
    super(props) ;
    console.log(props);
    this.state = SwipeSelector.propsToState(props);

  }

  componentWillMount() {

  }

  componentDidMount() {

  }

  componentWillReceiveProps() {

  }

  shouldComponentUpdate() {
    
  }

  _collateItems(items, currentIndex = 0) {
    //collate items and prepare for rendering

    let itemsList = circularize(items, currentIndex, true);

    let currentItem = null;
    let leftItems = [];
    let rightItems = [];

    let firstItem = itemsList.next();
    if (!firstItem.done) {
      currentItem = firstItem.value;
    }

    for (let i = 0; i< this._rightCount(items); i++) {
      rightItems.push(itemsList.next().value);
    }

    for (let j = 0; j< this._leftCount(items); j++) {
      leftItems.push(itemsList.next().value);
    }
    
    leftItems.reverse();

    items = [];
    if (currentItem) {
      items.push(currentItem);
    }

    while (leftItems.length > 0 && rightItems.length > 0) {
      items.push(rightItems.shift());
      items.push(leftItems.shift());
    }

    //if we have an even number and right has one more item than left
    if (rightItems.length !== 0)
      items.push(rightItems.shift());

    // first index needs to be drawn last, last needs to be drawn first
    items.reverse();

    return items;
  }

  render() {
    let items = this.state.children;
    console.log(items);

    items = this._collateItems(items, this.state.shownIndex);
    console.log('render', items);

    items = items.map(comp => comp.viewComponent);

    let targetDots = items.map(() => <View style={styles.dot} />);
//{ ...this.state.panResponder.panHandlers }
    return (
      <View

        ref={(ref) => this.wrapper = ref}
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100}}
      >
        {items}
        {targetDots}
        <TouchableOpacity style={{backgroundColor: '#333', position:'absolute', top:0, left:0}}  onPress={ () => {let self = this; debugger;} }><Text>DEBUG</Text></TouchableOpacity>
      </View>

    );
  }

}

export default SwipeSelector;
