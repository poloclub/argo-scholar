/**
 * @typedef {Object} LogValue A value that an interaction event changes
 * @property {string} name Value name
 * @property {string | number | number[]} value Value
 */

/**
 * @typedef {Object} Log A single event log
 * @property {string} eventName A string from ['click', 'dragEnd',
 *  'mouseEnter', 'mouseLeave']
 * @property {string} elementName Name of element that handles the event
 * @property {Date} time Timestamp for the event
 * @property {LogValue | null} oldValue The old value that this interaction
 *  changes from
 * @property {LogValue | null} newValue The new value that this interaction
 *  changes to
 */
import appState from "../stores";

/**
 * An object to log interaction events.
 */
export class Logger {
  /**
   * Initialize a new Logger object.
   * @param {any} [initialValues] Any objects to store with the logger
   */
  constructor(initialValues = null) {
    /** @type{Log[]} */
    this.log = [];

    this.initialValues = initialValues;

    /** @type{Date} */
    this.startTime = new Date();

    this.id = Math.round(Math.random() * 1000, 0);

    this.fileName =  `f${this.startTime}-${this.id}.json`;
    // Create a map to register any object on the fly
    /** @type {object[][]} Each entry is [key, value, timestamp]*/
    this.records = [];

    this.logNum = 0;
  }

  /**
   * Add a new log event
   * @param {object} obj Smart parameter
   * @param {string} obj.eventName A string from ['click', 'dragEnd',
   *  'mouseEnter', 'mouseLeave'] or any other given name
   * @param {string} obj.elementName Name of the element that users interact
   *  with
   * @param {Date | null} [obj.time] Timestamp for the event
   * @param {string | null} [obj.valueName] Name of the given value
   * @param {string | number | null | number[]} [obj.oldValue] Old value that
   *  this interaction changes from
   * @param {string | number | null | number[]} [obj.newValue] New value that
   *  this interaction changes to
   */
  addLog({
    eventName,
    elementName,
    time = null,
    valueName = null,
    oldValue = null,
    newValue = null
  }) {
    // Create a time stamp if it is not given
    const timeStamp = time !== null ? time : new Date();

    // Create value objects if they are given

    /** @type {LogValue} */
    let oldValueObj = null;

    /** @type {LogValue} */
    let newValueObj = null;

    if (valueName !== null) {
      if (oldValue !== null) {
        oldValueObj = {
          name: valueName,
          value: oldValue
        };
      }
      if (newValue !== null) {
        newValueObj = {
          name: valueName,
          value: newValue
        };
      }
    }

    // Create a new Log object
    /** @type {Log} */
    const newLog = {
      eventName,
      elementName,
      time: timeStamp,
      oldValue: oldValueObj,
      newValue: newValueObj
    };

    this.log.push(newLog);
    this.logNum += 1;
    if (this.logNum % 10 == 0) {
      appState.logger.uploadToS3();
    }
  }

  /**
   * Overwrite the initial values
   * @param {any} initialValues
   */
  setInitialValues(initialValues) {
    this.initialValues = initialValues;
  }

  /**
   * Add a key value pair to the internal record map.
   * @param {string} key Key name
   * @param {any} value Any serializable object
   */
  addRecord(key, value) {
    this.records.push([key, value, new Date()]);
  }

  /**
   * Detect what is the current browser and add the info to the record.
   */
  addBrowserRecord() {
    let browser = 'unknown';
    if (
      (!!window.opr && !!opr.addons) ||
      !!window.opera ||
      navigator.userAgent.indexOf(' OPR/') >= 0
    ) {
      browser = 'opera';
    } else if (typeof InstallTrigger !== 'undefined') {
      browser = 'firefox';
    } else if (
      /constructor/i.test(window.HTMLElement) ||
      (function (p) {
        return p.toString() === '[object SafariRemoteNotification]';
      })(
        !window['safari'] ||
          (typeof safari !== 'undefined' && window['safari'].pushNotification)
      )
    ) {
      browser = 'safari';
    } else if (/*@cc_on!@*/ false || !!document.documentMode) {
      browser = 'ie';
    } else if (!!window.StyleMedia) {
      browser = 'edge';
    } else if (
      !!window.chrome &&
      (!!window.chrome.webstore || !!window.chrome.runtime)
    ) {
      browser = 'chrome';
    }

    this.addRecord('browser', browser);
  }

  /**
   * Detect the current OS and add the info to the record.
   */
  addOSRecord() {
    let osName = 'Unknown OS';

    if (navigator.userAgent.indexOf('Win') != -1) osName = 'windows';
    if (navigator.userAgent.indexOf('Mac') != -1) osName = 'mac';
    if (navigator.userAgent.indexOf('Linux') != -1) osName = 'linux';
    if (navigator.userAgent.indexOf('Android') != -1) osName = 'android';
    if (navigator.userAgent.indexOf('like Mac') != -1) osName = 'ios';

    this.addRecord('os', osName);
  }

  /**
   * Export the logs as a JSON string.
   * @param {any} [endValues] Any values to exported with the log
   */
  toJSON(endValues = null) {
    const exportLog = {
      log: this.log,
      startTime: this.startTime,
      endTime: new Date(),
      initialValues: this.initialValues,
      endValues: endValues,
      records: this.records,
      key: this.fileName
    };
    return JSON.stringify(exportLog);
  }

  /**
   * Upload the
   */
  async uploadToS3() {
    try {
      const url = 'https://argo-cors-anywhere.herokuapp.com/https://h5r94usqaf.execute-api.us-east-1.amazonaws.com/default/LogArgoActions';

      const blob = new Blob([this.toJSON()], {type: 'application/json'});

      fetch(url, {
        method: 'POST',
        keepalive: true,
        body: blob
      });

    } catch (e) {
      console.error('Failed to upload to S3');
      // this.download();
      return -1;
    }

  }

  /**
   * Download the log file as a JSON file.
   */
  download() {
    downloadJSON(JSON.parse(this.toJSON()), null, 'strategy-data.json');
  }
}

window.addEventListener('beforeunload', (event) => {
  if (appState.logger.logNum > 3) {
    appState.logger.uploadToS3();
  }
  }
);