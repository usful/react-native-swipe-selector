"use strict";

import React from 'react';
import { StyleSheet, Text, View, Animated, Easing, PanResponder, TouchableOpacity } from 'react-native';
import { bound, range, circularize } from './helpers';
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

const _checkUniqueKeys = function(objArr) {
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
  static propsToState(props) {

    let children = React.Children.toArray(props.children);

    //Check if unique keys are given
    if (!_checkUniqueKeys(children)) {
      console.warn('Child elements require unique keys to update. Lack of unique keys will force a full component update whenever there is a re-render');
    }

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
      currentIndex: props.defaultIndex,
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

    state.children = encaseViews(state, state.children, state.descriptors);

    return state;
  }

  constructor (props) {
    super(props) ;
    this.state = SwipeSelector.propsToState(props);

    this.panResponder = PanResponder.create({
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
        let displacement = Vector.fromObject({x: gestureState.dx, y: gestureState.dy});

        let projection = displacement.clone().dot(this.state.unitVector);
        let increment = projection/this.state.scrollDistance;

        let animations = [];
        for (let item of this.state.children) {
          let newIndex;
          if (increment > 0)
            newIndex = (item.currentIndex + increment ) % (this.state.children.length);
          else
            newIndex = (item.currentIndex + increment + this.state.children.length) % (this.state.children.length);

          newIndex = Math.round(newIndex);
          animations.push( item.transition( newIndex, 150 ) );
        }

        Animated.parallel(animations).start( ({finished: finished}) => {

          if (!finished) return;

          // Set the currentIndexes
          for (let item of this.state.children) {
            let newIndex;
            let offset = item.currentIndex + increment;
            let length = this.state.children.length;

            // This double modulo is to deal with negative direction amounts
            newIndex = ( (offset % length) + length) % length ;

            newIndex = Math.round(newIndex) % this.state.children.length;
            item.currentIndex = newIndex;
          }
        });
      },

      onPanResponderMove: (e, gestureState) => {
        // TODO: Do the flicking thing
        let displacement = Vector.fromObject({x: gestureState.dx, y: gestureState.dy});
        let projection = displacement.clone().dot(this.state.unitVector);
        let increment = projection/this.state.scrollDistance;

        for (let item of this.state.children) {
          let newIndex;
          let offset = item.currentIndex + increment;
          let length = this.state.children.length;

          // This double modulo is to deal with negative direction amounts
          newIndex = ( (offset % length) + length) % length ;


          if ( ( Math.round(newIndex) < 1 || Math.round(newIndex) === length ) && this.currentIndex !== item.index)
            this.currentIndex = item.index;

          item.transitionTemp( newIndex );

        }

      },

      onPanResponderTerminationRequest: (e, gestureState) => {
        return false; // DO NOT RELEASE THE RESPONDER UNTIL WE ARE DONE
        // This allows you to use the area outside of the component for scrolling
      },

      onPanResponderTerminate: (e, gestureState) => {
        // Do nothing
      }
    })

  }

  get currentIndex () {
    return this.state.currentIndex;
  }

  set currentIndex (val) {
    this.setState({currentIndex: val}, this.props.onChange({index: val, component: this.state.children[val].component}));
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

    let oldUniqueKeys = _checkUniqueKeys(oldChildren);
    let newUniqueKeys = _checkUniqueKeys(newChildren);

    // non-unique or missing keys
    if (!newUniqueKeys) {
      console.warn('Child elements require unique keys to update. Lack of unique keys will force a full component update whenever there is a re-render');
    }

    // If this is a simple update
    // Need to check that both keys are internally fully defined and unique
    //  AND that the children are overlapping perfectly in the same order
    if (oldUniqueKeys
          && newUniqueKeys
          && oldChildren.length === newChildren.length
          && oldChildren.every( (child, ix) => child.props.id === newChildren[ix].props.id)) {

      newComponents = oldComponents.map( (comp, ix) => { comp.component = newChildren[ix]; return comp;});
      this.setState({children: newComponents});
    }
    // otherwise we need to contract the selector, swap the components, and then reinitialize the selector
    else {
      this.setState(SwipeSelector.propsToState(nextProps));
    }


    return;


    // newChildren.forEach( child => {
    //   if (child.props.key)
    //     let oldComponent = oldComponents.find( comp => comp.component.key)
    // });
    //
    // this.setState({children: newComponents});



  }

  shouldComponentUpdate(nextProps, nextState) {
    return true;
  }

  expandItems() {
    // If we're not in a contracted state, then don't do anything
    if (this.state.children.some( child => child.currentIndex !== 0 && child.currentIndex !== this.state.children.length)) return;

    let animations = [];
    this.state.children.forEach( (child) => {
      let finalIndex = _indexToPosition(this.currentIndex, child.index, this.state.children.length);
      let startIndex = Math.round(finalIndex/this.state.children.length) * (this.state.children.length) ;

      child.currentIndex = startIndex;
      child.shownIndex = startIndex;
      animations.push(child.transition(finalIndex));
    });
    Animated.parallel(animations).start( ({finished: finished}) => {

      if (!finished) return;
      this.state.children.forEach( (child) => {
        let finalIndex = _indexToPosition(this.currentIndex, child.index, this.state.children.length);
        child.currentIndex = finalIndex;
        child.shownIndex = finalIndex;
      });
    })

  }

  contractItems() {
    let animations = [];
    this.state.children.forEach( (child) => {
      let finalIndex = Math.round(child.shownIndex/this.state.children.length) * (this.state.children.length);
      animations.push(child.transition(finalIndex));
    });
    Animated.parallel(animations).start( ({finished: finished}) => {
      if (!finished) return;
      this.state.children.forEach( (child) => {
        child.currentIndex = 0;
        child.shownIndex = 0;
      })
    });

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
        { ...this.panResponder.panHandlers }
        ref={(ref) => this.wrapper = ref}
        style={{ flex: 1, alignSelf: 'stretch', justifyContent: 'center', alignItems: 'center', marginTop: 100}}
      >
        {items}
        <TouchableOpacity style={{backgroundColor: '#333', position:'absolute', top:0, left:0}}  onPress={ () => {this.contractItems(); setTimeout(this.expandItems.bind(this), 1500);} }><Text>DEBUG</Text></TouchableOpacity>
      </View>

    );
  }

}

export default SwipeSelector;
