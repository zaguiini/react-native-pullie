import React from 'react'
import {
  ViewProps,
  Dimensions,
  Animated,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native'

const { height } = Dimensions.get('window')

interface PullieProps {
  children: React.ReactNode
  isOpen: boolean
  teaser: React.ReactNode
  teaserHeight: number
  style?: ViewProps['style']
  setIsOpen: (isOpen: boolean) => void
  screenHeightPercentage?: number
  backdropOpacity?: number
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: 'black',
  },

  backdropContent: {
    width: '100%',
    height: '100%',
  },

  content: {
    height: height,
  },

  headerContainer: {
    width: '100%',
  },
})

const pulledDown = ({ dy }: PanResponderGestureState) => dy > 0
const pulledUp = ({ dy }: PanResponderGestureState) => dy < 0
const pulledFar = ({ dy }: PanResponderGestureState) => Math.abs(dy) > 50
const grantPanResponder = () => true

function Pullie({
  children,
  isOpen,
  teaser,
  teaserHeight,
  backdropOpacity = 70,
  style,
  setIsOpen,
  screenHeightPercentage = 70,
}: PullieProps) {
  const [isPulling, setIsPulling] = React.useState(false)

  const settings = React.useRef({
    position: {
      max: height,
      start: height - teaserHeight,
      end: height * (1 - screenHeightPercentage / 100),
      min: 0,
    },
    opacity: {
      start: 0,
      end: backdropOpacity / 100,
    },
  })

  const state = React.useRef({
    currentPosition: 0,
    animatedOpacity: new Animated.Value(settings.current.opacity.start),
    animatedPosition: new Animated.Value(settings.current.position.start),
  })

  const handlePanResponderGrant = React.useCallback(() => {
    setIsPulling(true)
    state.current.animatedPosition.setOffset(state.current.currentPosition)
    state.current.animatedPosition.setValue(0)
  }, [])

  const insideAllowedRange = React.useCallback(() => {
    const { currentPosition } = state.current
    const { position } = settings.current

    return currentPosition >= position.min && currentPosition <= position.max
  }, [])

  const handlePanResponderMove = React.useCallback(
    (_: GestureResponderEvent, gestureState: PanResponderGestureState) => {
      if (insideAllowedRange()) {
        state.current.animatedPosition.setValue(gestureState.dy)
      }
    },
    []
  )

  const restore = React.useCallback(() => {
    setIsOpen(isOpen)
  }, [isOpen])

  const open = React.useCallback(() => {
    setIsOpen(true)
  }, [])

  const close = React.useCallback(() => {
    setIsOpen(false)
  }, [])

  const handlePanResponderEnd = React.useCallback(
    (e: GestureResponderEvent, gestureState: PanResponderGestureState) => {
      state.current.animatedPosition.flattenOffset()
      setIsPulling(false)

      if (pulledDown(gestureState) && pulledFar(gestureState)) {
        return close()
      } else if (pulledUp(gestureState) && pulledFar(gestureState)) {
        return open()
      } else {
        restore()
      }
    },
    []
  )

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: grantPanResponder,
      onStartShouldSetPanResponderCapture: grantPanResponder,
      onMoveShouldSetPanResponder: grantPanResponder,
      onMoveShouldSetPanResponderCapture: grantPanResponder,
      onPanResponderGrant: handlePanResponderGrant,
      onPanResponderMove: handlePanResponderMove,
      onPanResponderTerminationRequest: grantPanResponder,
      onPanResponderRelease: handlePanResponderEnd,
      onPanResponderTerminate: handlePanResponderEnd,
      onShouldBlockNativeResponder: grantPanResponder,
    })
  )

  React.useEffect(() => {
    state.current.animatedPosition.addListener(value => {
      state.current.currentPosition = value.value
      state.current.animatedOpacity.setValue(state.current.currentPosition)
    })

    return () => {
      state.current.animatedPosition.removeAllListeners()
    }
  }, [])

  React.useEffect(() => {
    let position

    if (isOpen) {
      position = settings.current.position.end
    } else {
      position = settings.current.position.start
    }

    Animated.timing(state.current.animatedPosition, {
      toValue: position,
      duration: 400,
    }).start()
  }, [isOpen])

  const animatedOpacity = state.current.animatedOpacity.interpolate({
    inputRange: [
      settings.current.position.end,
      settings.current.position.start,
    ],
    outputRange: [settings.current.opacity.end, settings.current.opacity.start],
  })

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: isOpen || isPulling ? 0 : height - teaserHeight,
        },
      ]}
    >
      <Animated.View style={[styles.backdrop, { opacity: animatedOpacity }]}>
        <TouchableWithoutFeedback onPress={close}>
          <View style={styles.backdropContent} />
        </TouchableWithoutFeedback>
      </Animated.View>
      <Animated.View
        style={[
          styles.content,
          {
            paddingBottom: 0,
            width: '100%',
            transform: [
              { translateY: state.current.animatedPosition },
              { translateX: 0 },
            ],
          },
          style,
        ]}
      >
        <View
          style={styles.headerContainer}
          {...panResponder.current.panHandlers}
        >
          {teaser}
        </View>
        <View
          style={{
            height: height * (screenHeightPercentage / 100) - teaserHeight,
          }}
        >
          {children}
        </View>
      </Animated.View>
    </Animated.View>
  )
}

export default Pullie
