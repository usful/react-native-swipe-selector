"use strict";

import React from 'react';
import { StyleSheet, Text, View, Animated, Easing, PanResponder, TouchableOpacity } from 'react-native';
import { bound, range, circularize, deepCompare } from './helpers';
import { scaleLinear, scaleLogarithmic, scaleSqrt } from './scalers'
import encaseViews from './encaseViews';

// CAUTION: Vector functions mutate
import Vector from 'victor';

/**
 * Enumeration used to determine the scroll directions to be used for a SwipeSelector
 * @type {{}}
 * @private
 */
const _scrollDirections = {
  HORIZONTAL: Symbol('horizontal'), // scroll right increases index
  VERTICAL: Symbol('vertical'), // scroll down increases index
  ADAPTIVE: Symbol('adaptive'), // adapts the scroll axis to the direction of the vanishing points
  CUSTOM: Symbol('custom') // custom scroll vector
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
                                          leftPoint = {x: -1, y:0},
                                          rightPoint = {x: 1, y:0},
                                          customVector = {x: 1, y: 0} ) {
  switch(scrollDirection) {
    case _scrollDirections.HORIZONTAL:
      return Vector.fromObject({x: 1, y: 0});
    case _scrollDirections.VERTICAL:
      return Vector.fromObject({x: 0, y: -1});
    case _scrollDirections.ADAPTIVE:
      let left = Vector.fromObject(fixPoints.leftPoint).norm();
      let right = Vector.fromObject(fixPoints.rightPoint).norm();
      let axis = left.clone().add(right).rotateByDeg(-90).norm();
      return axis;
    case _scrollDirections.CUSTOM:
      return Vector.fromObject(customVector).norm();
    default:
      return Vector.fromObject({x: 1, y: 0});
  }
};

/**
 * Enumeration used to determine the particular type of scaling for animation
 * @type {{}}
 * @private
 */
const _scaling = {
  LINEAR: Symbol('linear'),
  LOGARITHMIC: Symbol('logarithmic'),
  SQRT: Symbol('sqrt')
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
  onChange: () => {},
  defaultIndex: 0,
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

const _indexToPosition = function(currentIndex, itemIndex, maxIndex) {
  let newIndex;
  let offset = itemIndex - currentIndex;
  newIndex = ( (offset % maxIndex) + maxIndex ) % maxIndex ;

  return newIndex;
};

const _getUniqueKeySet = function (compArr) {
  return new Set(compArr.map( e => e.props.id ).filter( e => e ));
};

const _checkUniqueIds = function(objArr) {
  let keys = _getUniqueKeySet(objArr);
  return keys.size === objArr.length;
};

const styles = StyleSheet.create({
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    margin: 10,
    backgroundColor: '#2B81B0'
  }
});

class SwipeSelector extends React.Component {
  //TODO: Flicking
  //TODO: Hidden Arm
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
  static propsToState(props, createViewComponents = true, centrePoint = {x: 0, y:0}) {

    let children = React.Children.toArray(props.children);
    let descriptors = children.map( el => ( el.props.descriptor || '' ));

    //Check if unique keys are given
    if (!_checkUniqueIds(children)) {
      console.warn('Child elements require unique ids to update. Lack of unique ids will force a full component update whenever there is a re-render');
    }

    let shownCount = (props.hide) ? bound(children.length, {lower: 0, upper: props.show}) :  children.length;
    let hideCount = (props.hide) ? max(children.length-props.show, 0) : 0;

    let state = {
      children: null, // resolved to a value below
      descriptors: descriptors,
      descriptorDistance: props.descriptorDistance,
      descriptorAbove: props.descriptorAbove,
      leftPoint: props.leftPoint,
      rightPoint: props.rightPoint,
      currentIndex: props.defaultIndex,
      leftCount: Math.floor( ( shownCount -1 ) /2 ),
      rightCount: Math.ceil( ( shownCount -1 ) /2 ),
      hideCount: hideCount,
      totalCount: children.length,
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

    if (createViewComponents) {
      state.children = encaseViews(state, children, descriptors, centrePoint);
    }

    return state;
  }

  constructor (props) {
    super(props) ;

    this._centrePoint = new Animated.ValueXY({x: 0, y: 0});
    this.state = SwipeSelector.propsToState(props, true, this._centrePoint);

    this._panResponder = PanResponder.create({
      onStartShouldSetPanResponderCapture: (e, gestureState) => {
        // TODO: block touches to non-current index components
        return false;
      },

      onMoveShouldSetPanResponderCapture: (e, gestureState) => {
        return false; // Should not grab if interacting with something else
      },

      onStartShouldSetPanResponder: (e, gestureState) => {
        // If the event is starting in the component and it bubbles up, grab it
        return true;
      },

      onMoveShouldSetPanResponder: (e, gestureState) => {
        // TODO: have a negative hitslop, so can grab from child elements if required
        return false; // Should not grab if interacting with something else
      },

      onPanResponderGrant: (e, gestureState) => {
        // Do nothing, setup code is in onPanResponderStart
      },

      onPanResponderReject: (e, gestureState) => {
        // Do nothing
      },

      onPanResponderStart: (e, gestureState) => {
        // TODO: set up all resources required
        this.state.children.forEach( (child) => {
          let finalIndex =_indexToPosition(this.currentIndex, child.index, this.state.children.length);
          child.currentIndex = finalIndex;
          child.shownIndex = finalIndex;
        });
      },

      onPanResponderEnd: (e, gestureState) => {
        // TODO: release all resources used
        this.transitionTo(this.currentIndex, null, 150);
      },

      onPanResponderMove: (e, gestureState) => {
        // TODO: Do the flicking thing
        // Gesture displacement vector
        let displacement = Vector.fromObject({x: gestureState.dx, y: gestureState.dy});
        // Displacement vector projection to find distance travelled along scrolling axis
        let projection = displacement.clone().dot(this.state.unitVector);
        // How many indices have been traversed based on the given projection
        let increment = projection/this.state.scrollDistance;

        for (let item of this.state.children) {
          let newIndex;
          let offset = item.currentIndex + increment;
          let length = this.state.children.length;

          // This double modulo is to deal with negative direction amounts
          newIndex = ( (offset % length) + length) % length ;


          if ( ( Math.round(newIndex) < 1 || Math.round(newIndex) === length ) && this.currentIndex !== item.index)
            this.currentIndex = item.index;

          item.shownIndex = newIndex ;
          item.currentIndex = Math.round(newIndex) % length;

        }

      },

      onPanResponderTerminationRequest: (e, gestureState) => {
        return false; // DO NOT RELEASE THE RESPONDER UNTIL WE ARE DONE
        // This allows you to use the area outside of the component for scrolling
      },

      onPanResponderTerminate: (e, gestureState) => {
        // Do nothing
      }
    });

    this.nextState = null;

  }

  get currentIndex () {
    return this.state.currentIndex;
  }

  set currentIndex (val) {
    this.setState({currentIndex: val}, () => this.props.onChange({index: val, component: this.state.children[val].component}));
    return val
  }

  componentWillMount() {

  }

  componentDidMount() {
    this.expandItems();
  }

  componentWillReceiveProps(nextProps) {

    let oldComponents = this.state.children;
    let newComponents = [];
    let oldChildren = React.Children.toArray(this.props.children);
    let newChildren = React.Children.toArray(nextProps.children);

    // If there are changes outside of descriptors or components, need to do a full update
    let newState = SwipeSelector.propsToState(nextProps, false);

    // Is this a refresh
    if (!deepCompare(this.state, newState, ['children', 'descriptors', 'currentIndex'])) {
      // full refresh, so may as well regenerate the entire state object
      newState = SwipeSelector.propsToState(nextProps, true, this._centrePoint);
      Animated.parallel(newState.children.map( e => e.shrink(0))).start();
      this.nextState = newState;
      this.shrinkItems( () => {

        this.setState(this.nextState, () => {
          this.restoreItems();
          this.expandItems();
          this.currentIndex = this.currentIndex;
        })

      });
    }
    // Might have absolutely no changes, but can't say for sure
    else {
      let oldUniqueIds = _checkUniqueIds(oldChildren);
      let newUniqueIds = _checkUniqueIds(newChildren);

      // If this is a simple update
      // Need to check that both keys are internally fully defined and unique
      //  AND that the children are overlapping perfectly in the same order
      if (oldUniqueIds
            && newUniqueIds
            && oldChildren.length === newChildren.length
            && oldChildren.every( (child, ix) => child.props.id === newChildren[ix].props.id)) {

        newComponents = oldComponents.map((comp, ix) => {
          comp.component = newChildren[ix];
          comp.descriptor = newChildren[ix].props.descriptor || '';
          return comp;
        });

        this.nextState = {};
        this.setState({children: newComponents});
      }
      else {
        // This is a change of children
        newState = SwipeSelector.propsToState(nextProps, true, this._centrePoint);
        Animated.parallel(newState.children.map( e => e.shrink(0))).start();
        this.nextState = newState;
        this.shrinkItems(() => {
          this.setState(this.nextState, () => {
            this.restoreItems();
            this.expandItems();
            this.currentIndex = this.currentIndex;
          })
        });
      }
    }

    return;

  }

  shouldComponentUpdate(nextProps, nextState) {
    return true;
  }

  expandItems(cb) {
    // If we're not in a contracted state, then don't do anything
    if (this.state.children.some( child => child.currentIndex !== 0 && child.currentIndex !== this.state.children.length)) return;

    let animations = [];
    this.state.children.forEach( (child) => {
      let finalIndex = _indexToPosition(this.currentIndex, child.index, this.state.children.length);
      let startIndex = Math.round(finalIndex/this.state.children.length) * (this.state.children.length) ;

      child.currentIndex = startIndex;
      child.shownIndex = startIndex;
      animations.push(child.transitionAnimation(finalIndex));
    });
    Animated.parallel(animations).start( ({finished: finished}) => {

      if (!finished) return;

      this.state.children.forEach( (child) => {
        let finalIndex = _indexToPosition(this.currentIndex, child.index, this.state.children.length);
        child.currentIndex = finalIndex;
        child.shownIndex = finalIndex;
      });

      if (cb) cb(this.state.children);
    })

  }

  contractItems(cb) {
    let animations = [];
    this.state.children.forEach( (child) => {
      let finalIndex = Math.round(child.shownIndex/this.state.children.length) * (this.state.children.length);
      animations.push(child.transitionAnimation(finalIndex));
    });
    Animated.parallel(animations).start( ({finished: finished}) => {

      if (!finished) return;

      this.state.children.forEach( (child) => {
        child.currentIndex = 0;
        child.shownIndex = 0;
      });

      if (cb) cb(this.state.children);
    });

  }

  restoreItems(cb, duration = 500) {
    Animated.parallel(this.state.children.map( child => child.restore(duration) )
    ).start( ({finished: finished}) => {
      if (!finished) return;

      if (cb) cb();
    });
  }

  shrinkItems(cb, duration = 500) {
    Animated.parallel(this.state.children.map( child => child.shrink(duration) )
    ).start( ({finished: finished}) => {
      if (!finished) return;

      if (cb) cb();
    });
  }

  /**
   * Transitions to a targeted index over a given duration
   * Will do no more than half a rotation to reach its destination
   * @param {number} finalIndex
   * @param {function} [cb] Callback function executed at the end of the transition (if successful)
   * @param {number} [duration=1000]
   */
  transitionTo (finalIndex, cb, duration = 1000) {

    // naive check for integer argument
    if (finalIndex%1 !== 0)
      throw new Error(`Integer argument expected, received ${finalIndex} instead`);

    if (finalIndex > this.state.totalCount - 1 || finalIndex < 0)
      throw new Error(`Transition destination ${finalIndex} out of bounds`);

    let currentIndex = this.currentIndex;
    // Reorient the frame of reference to treat the current index as 0
    let dest = ( ( (finalIndex + this.state.totalCount) - currentIndex ) % this.state.totalCount );

    let offset = (this.state.totalCount/2) - dest;

    // The sign of the offset indicates whether it should be a positive (right) transition
    //  or a negative (left) transition. The default value forces a right direction transition
    //  when moving to the exact opposite location on the circle
    // The amount of the offset indicates how far in that direction it should go
    let distance = Math.sign( offset || 1 )*( (this.state.totalCount/2) - Math.abs(offset) );

    this.transition(distance, cb, duration);

  }

  /**
   * Rotates a certain distance over a given duration
   * @param {number} distance The amount of steps to take, sign indicates direction (positive - right, negative - left)
   * @param {function} [cb] Callback function executed at the end of the transition (if successful)
   * @param {number} [duration=1000]
   */
  transition (distance, cb, duration = 1000) {

    // naive check for integer argument
    if (distance%1 !== 0)
      throw new Error(`Integer argument expected, received ${distance} instead`);

    // For the special case of resetting to the current index
    if (distance === 0) {
      // Need to determine if this is resolving with a right or left rotation
      let currentElement = this.state.children[this.currentIndex];
      let finalIndex = Math.round(currentElement.shownIndex);

      this._transitionAnimation(this.currentIndex, duration, finalIndex > 0 )
            .start( ({finished: finished}) => {
              if (!finished) return;

              if (cb) cb();
            });
    }
    else {
      let rotRight = Math.sign(distance) < 0; // if it's a negative distance that means we're moving items to the right
      // Using a logarithmic timing curve
      // TODO: Make this a configurable property
      let scale = scaleLogarithmic(
                                {start: 0, end: distance},
                                {start: 0, end: duration}
                              );

      // The list of first differences of the timed points gives the interval durations for each individual transition
      let intervals = [ ...range(0, distance + Math.sign(distance), Math.sign(distance)) ]
                        .map( e => scale(e) )
                        .map( (e, ix, arr) => (ix === 0) ? e : e-arr[ix-1])
                        .slice(1);

      // Generate a list of animations, each animation is itself a composite animation of all children moving to their
      //  final location for that transition
      let transitionalIndexes = [ ...range(Math.sign(distance), distance + Math.sign(distance), Math.sign(distance)) ]
                                  .map( offset => ( ( (this.currentIndex + offset ) % this.state.totalCount ) + this.state.totalCount ) % this.state.totalCount );
      let animations = transitionalIndexes
        .map( (destIndex, ix) => this._transitionAnimation(destIndex, intervals[ix], rotRight) );

      // Each animation needs to be manually handled so that the child shownIndex is set properly when an item wraps
      //   (transition from n+1 -> 0 for an array of n items)
      let currentAnimation = 0;
      let handleAnimFinish = ({finished: finished}) => {
        if (!finished) return;

        // Update the frontmost element for the next animation
        this.state.children[transitionalIndexes[currentAnimation]].shownIndex = ( rotRight ? 0 : this.state.totalCount );

        let currentSelectedIndex = transitionalIndexes[currentAnimation];

        // update all current indexes of all children
        let currentIndexes = [
          ...circularize(
            [ ...range(0, this.state.totalCount)],
            currentSelectedIndex,
            true)
        ];
        currentIndexes.forEach( (e, ix) => {
                                            this.state.children[e].currentIndex = ix;
                                            this.state.children[e].shownIndex = ix;
                              });

        // Done traversing
        if (currentAnimation === animations.length-1) {
          this.state.children[currentSelectedIndex].shownIndex = this.state.totalCount;

          this.currentIndex = transitionalIndexes[currentAnimation];
          if (cb) cb();
        }
        else {
          currentAnimation++;
          animations[currentAnimation].start( handleAnimFinish );
        }
      };

      animations[0].start( handleAnimFinish );

    }
  }

  /**
   * Generates a composite animation that moves all elements to their final location from their current location
   * @param {number} nextIndex
   * @param {number} [duration=1000]
   * @param {boolean} [rotRight=false] Whether the transition is rotating to the right or rotating to the left
   * @returns {*} An uninitiated composite animation
   * @private
   */
  _transitionAnimation (nextIndex, duration = 1000, rotRight = false) {

    // naive check for integer argument
    if (nextIndex%1 !== 0)
      throw new Error(`Integer argument expected, received ${nextIndex} instead`);

    let animations = [
                        ...circularize(
                                        [ ...range(0, this.state.totalCount) ],
                                        nextIndex,
                                        true
                        )
                     ]
                      .map( (e, ix) =>
                                this.state.children[e]
                                  .transitionAnimation(
                                                        // if this is a rotation to the right
                                                        //  the 0 state is actually the n+1 state
                                                        ( ix === 0 && rotRight ? this.state.totalCount : ix ),
                                                        duration
                                                      )
                          );

    return Animated.parallel(animations);

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

    for (let i = 0; i< this.state.rightCount; i++) {
      rightItems.push(itemsList.next().value);
    }

    for (let j = 0; j< this.state.leftCount; j++) {
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

    items = this._collateItems(items, this.currentIndex);
    items = items.map(comp => comp.viewComponent);


    return (
      <View
        { ...this._panResponder.panHandlers }
        onLayout={
          ({nativeEvent: {layout: {width: width, height: height}}}) => {
            this._centrePoint.setValue({
              x: width/2,
              y: height/2
            });
          }
        }
        ref={(ref) => {this.wrapper = ref}}
        style={[this.props.style, { flex: 1, alignSelf: 'stretch', justifyContent: 'center', alignItems: 'center'}]}
      >
        {items}
        <TouchableOpacity style={{backgroundColor: '#333', position:'absolute', top:0, left:0}}  onPress={ () => {this.transitionTo(3)} }><Text>DEBUG</Text></TouchableOpacity>
      </View>

    );
  }

}

export default SwipeSelector;
