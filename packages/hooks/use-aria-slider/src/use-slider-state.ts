import {clamp, snapValueToStep, useControlledState} from "@react-stately/utils";
import {Orientation} from "@react-types/shared";
import {SliderProps} from "@react-types/slider";
import {useCallback, useMemo, useRef, useState} from "react";

export interface SliderState {
  /**
   * Values managed by the slider by thumb index.
   */
  readonly values: number[];
  /**
   * Get the value for the specified thumb.
   * @param index
   */
  getThumbValue(index: number): number;

  /**
   * Sets the value for the specified thumb.
   * The actual value set will be clamped and rounded according to min/max/step.
   * @param index
   * @param value
   */
  setThumbValue(index: number, value: number): void;

  /**
   * Sets the thumb value to minimal possible value
   * If there are several thumbs in the slider (range slider) and the thumb with the passed index rests against another thumb,
   * then this other thumb will also be set to the minimum value
   * @param index
   */
  setThumbToMinValue(index: number): void;

  /**
   * Sets the thumb value to minimal possible value
   * If there are several thumbs in the slider (range slider) and the thumb with the passed index rests against another thumb,
   * then this other thumb will also be set to the maximum value
   * @param index
   */
  setThumbToMaxValue(index: number): void;

  /**
   * Sets value for the specified thumb by percent offset (between 0 and 1).
   * @param index
   * @param percent
   */
  setThumbPercent(index: number, percent: number): void;

  /**
   * Whether the specific thumb is being dragged.
   * @param index
   */
  isThumbDragging(index: number): boolean;
  /**
   * Set is dragging on the specified thumb.
   * @param index
   * @param dragging
   */
  setThumbDragging(index: number, dragging: boolean): void;

  /**
   * Currently-focused thumb index.
   */
  readonly focusedThumb: number | undefined;
  /**
   * Set focused true on specified thumb. This will remove focus from
   * any thumb that had it before.
   * @param index
   */
  setFocusedThumb(index: number | undefined): void;

  /**
   * Returns the specified thumb's value as a percentage from 0 to 1.
   * @param index
   */
  getThumbPercent(index: number): number;

  /**
   * Returns the value as a percent between the min and max of the slider.
   * @param index
   */
  getValuePercent(value: number): number;

  /**
   * Returns the string label for the specified thumb's value, per props.formatOptions.
   * @param index
   */
  getThumbValueLabel(index: number): string;

  /**
   * Returns the string label for the value, per props.formatOptions.
   * @param index
   */
  getFormattedValue(value: number): string;

  /**
   * Returns the min allowed value for the specified thumb.
   * @param index
   */
  getThumbMinValue(index: number): number;

  /**
   * Returns the max allowed value for the specified thumb.
   * @param index
   */
  getThumbMaxValue(index: number): number;

  /**
   * Converts a percent along track (between 0 and 1) to the corresponding value.
   * @param percent
   */
  getPercentValue(percent: number): number;

  /**
   * Returns if the specified thumb is editable.
   * @param index
   */
  isThumbEditable(index: number): boolean;

  /**
   * Set the specified thumb's editable state.
   * @param index
   * @param editable
   */
  setThumbEditable(index: number, editable: boolean): void;

  /**
   * Increments the value of the thumb by the step or page amount.
   */
  incrementThumb(index: number, stepSize?: number): void;

  /**
   * Decrements the value of the thumb by the step or page amount.
   */
  decrementThumb(index: number, stepSize?: number): void;

  /**
   * The step amount for the slider.
   */
  readonly step: number;

  /**
   * The page size for the slider, used to do a bigger step.
   */
  readonly pageSize: number;

  /** The orientation of the slider. */
  readonly orientation: Orientation;

  /** Whether the slider is disabled. */
  readonly isDisabled: boolean;
}

const DEFAULT_MIN_VALUE = 0;
const DEFAULT_MAX_VALUE = 100;
const DEFAULT_STEP_VALUE = 1;

export interface SliderStateOptions<T> extends SliderProps<T> {
  numberFormatter: Intl.NumberFormat;
}

/**
 * Provides state management for a slider component. Stores values for all thumbs,
 * formats values for localization, and provides methods to update the position
 * of any thumbs.
 * @param props
 */
export function useSliderState<T extends number | number[]>(
  props: SliderStateOptions<T>,
): SliderState {
  const {
    isDisabled = false,
    minValue = DEFAULT_MIN_VALUE,
    maxValue = DEFAULT_MAX_VALUE,
    numberFormatter: formatter,
    step = DEFAULT_STEP_VALUE,
    orientation = "horizontal",
  } = props;

  // Page step should be at least equal to step and always a multiple of the step.
  let pageSize = useMemo(() => {
    let calcPageSize = (maxValue - minValue) / 10;

    calcPageSize = snapValueToStep(calcPageSize, 0, calcPageSize + step, step);

    return Math.max(calcPageSize, step);
  }, [step, maxValue, minValue]);

  let restrictValues = useCallback(
    (values: number[]) =>
      values?.map((val, idx) => {
        let min = idx === 0 ? minValue : val[idx - 1];
        let max = idx === values.length - 1 ? maxValue : val[idx + 1];

        return snapValueToStep(val, min, max, step);
      }),
    [minValue, maxValue, step],
  );

  let value = useMemo(() => restrictValues(convertValue(props.value)), [props.value]);
  let defaultValue = useMemo(
    () => restrictValues(convertValue(props.defaultValue) ?? [minValue]),
    [props.defaultValue, minValue],
  );
  let onChange = createOnChange(props.value, props.defaultValue, props.onChange);
  let onChangeEnd = createOnChange(props.value, props.defaultValue, props.onChangeEnd);

  const [values, setValuesState] = useControlledState<number[]>(value, defaultValue, onChange);
  const [isDraggings, setDraggingsState] = useState<boolean[]>(
    new Array(values.length).fill(false),
  );

  const isEditablesRef = useRef<boolean[]>(new Array(values.length).fill(true));

  const [focusedIndex, setFocusedIndex] = useState<number | undefined>(undefined);
  const focusedIndexRef = useRef<number | undefined>(focusedIndex);

  const valuesRef = useRef<number[]>(values);
  const isDraggingsRef = useRef<boolean[]>(isDraggings);

  let setValues = (values: number[]) => {
    valuesRef.current = values;
    setValuesState(values);
  };

  let setDraggings = (draggings: boolean[]) => {
    isDraggingsRef.current = draggings;
    setDraggingsState(draggings);
  };

  function getValuePercent(value: number) {
    return (value - minValue) / (maxValue - minValue);
  }

  function getThumbMinValue(index: number) {
    return index === 0 ? minValue : values[index - 1];
  }
  function getThumbMaxValue(index: number) {
    return index === values.length - 1 ? maxValue : values[index + 1];
  }

  function isThumbEditable(index: number) {
    return isEditablesRef.current[index];
  }

  function setThumbEditable(index: number, editable: boolean) {
    isEditablesRef.current[index] = editable;
  }

  function updateValue(index: number, value: number) {
    let controlIndex = index;

    if (isDisabled || !isThumbEditable(controlIndex)) {
      return;
    }

    const stackedThumbs = getStackedThumbs(values);
    const isThumbsStuck = stackedThumbs.length !== 0;
    const stackedThumbIndex = stackedThumbs.filter(
      (i) => i !== (focusedIndexRef.current ?? controlIndex),
    )[0];

    const indexMinValue = getThumbMinValue(index);
    const indexMaxValue = getThumbMaxValue(index);

    const isPossibleUpdateValue = value >= indexMinValue && value <= indexMaxValue;

    if (isThumbsStuck && !isPossibleUpdateValue) {
      focusedIndexRef.current = stackedThumbIndex;

      controlIndex = stackedThumbIndex;
      setFocusedIndex(controlIndex);
    }

    // Check it again in case the thumbs are stuck and the control index has changed
    if (isDisabled || !isThumbEditable(controlIndex)) {
      return;
    }

    const thisMin = getThumbMinValue(controlIndex);
    const thisMax = getThumbMaxValue(controlIndex);

    // Round value to multiple of step, clamp value between min and max
    value = snapValueToStep(value, thisMin, thisMax, step);

    let newValues = replaceIndex(valuesRef.current, controlIndex, value);

    // Preventing re-rendering if the new values are equal to the current ones
    if (!isValuesEqual(newValues, values)) {
      setValues(newValues);
    }
  }

  function updateDragging(index: number, dragging: boolean) {
    if (isDisabled || !isThumbEditable(index)) {
      return;
    }
    if (dragging) {
      valuesRef.current = values;
    }

    const wasDragging = isDraggingsRef.current[index];

    isDraggingsRef.current = replaceIndex(isDraggingsRef.current, index, dragging);
    setDraggings(isDraggingsRef.current);

    // Call onChangeEnd if no handles are dragging.
    if (onChangeEnd && wasDragging && !isDraggingsRef.current.some(Boolean)) {
      onChangeEnd(valuesRef.current);
    }
  }

  function getFormattedValue(value: number) {
    return formatter.format(value);
  }

  function setThumbPercent(index: number, percent: number) {
    updateValue(index, getPercentValue(percent));
  }

  function getRoundedValue(value: number) {
    return Math.round((value - minValue) / step) * step + minValue;
  }

  function getPercentValue(percent: number) {
    const val = percent * (maxValue - minValue) + minValue;

    return clamp(getRoundedValue(val), minValue, maxValue);
  }

  function incrementThumb(index: number, stepSize: number = 1) {
    let s = Math.max(stepSize, step);

    updateValue(index, snapValueToStep(values[index] + s, minValue, maxValue, step));
  }

  function decrementThumb(index: number, stepSize: number = 1) {
    let s = Math.max(stepSize, step);

    updateValue(index, snapValueToStep(values[index] - s, minValue, maxValue, step));
  }

  function setThumbToMaxValue(index: number) {
    for (let i = index; i < values.length; i++) {
      const thumbMaxValue = getThumbMaxValue(i);

      if (thumbMaxValue === maxValue) {
        updateValue(i, thumbMaxValue);

        return;
      }

      updateValue(i, thumbMaxValue);
    }
  }

  function setThumbToMinValue(index: number) {
    for (let i = index; i >= 0; i--) {
      const thumbMinValue = getThumbMinValue(i);

      if (thumbMinValue === minValue) {
        updateValue(i, thumbMinValue);

        return;
      }

      updateValue(i, thumbMinValue);
    }
  }

  function setFocusedThumb(index: number | undefined) {
    focusedIndexRef.current = index;
    setFocusedIndex(focusedIndexRef.current);
  }

  return {
    values: values,
    getThumbValue: (index: number) => values[index],
    setThumbValue: updateValue,
    setThumbToMinValue,
    setThumbToMaxValue,
    setThumbPercent,
    isThumbDragging: (index: number) => isDraggings[index],
    setThumbDragging: updateDragging,
    focusedThumb: focusedIndex,
    setFocusedThumb,
    getThumbPercent: (index: number) => getValuePercent(values[index]),
    getValuePercent,
    getThumbValueLabel: (index: number) => getFormattedValue(values[index]),
    getFormattedValue,
    getThumbMinValue,
    getThumbMaxValue,
    getPercentValue,
    isThumbEditable,
    setThumbEditable,
    incrementThumb,
    decrementThumb,
    step,
    pageSize,
    orientation,
    isDisabled,
  };
}

function replaceIndex<T>(array: T[], index: number, value: T) {
  if (array[index] === value) {
    return array;
  }

  return [...array.slice(0, index), value, ...array.slice(index + 1)];
}

function convertValue(value: number | number[]) {
  if (value == null) {
    return undefined;
  }

  return Array.isArray(value) ? value : [value];
}

function createOnChange(value, defaultValue, onChange) {
  return (newValue: number[]) => {
    if (typeof value === "number" || typeof defaultValue === "number") {
      onChange?.(newValue[0]);
    } else {
      onChange?.(newValue);
    }
  };
}

const getStackedThumbs = (values: number[]) => {
  return values.reduce((arr, _, i) => {
    if (i === 0) return arr;

    if (values[i] === values[i - 1]) arr.push(i - 1, i);

    return arr;
  }, [] as number[]);
};

function isValuesEqual(arrOne: number[], arrTwo: number[]) {
  if (arrOne.length !== arrTwo.length) return false;

  let isEqual = true;

  arrOne.forEach((_, index) => {
    if (arrOne[index] !== arrTwo[index]) {
      isEqual = false;

      return;
    }
  });

  return isEqual;
}
