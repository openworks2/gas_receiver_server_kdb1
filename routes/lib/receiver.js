const queryconfig = require('../../config/query/receive_query');

const pool = require('../../config/connectionPool');
const request = require('request');
const mysql = require('mysql');

const moment = require('moment');
require('moment-timezone');
moment.tz.setDefault('Asia/Seoul');

const receiver = {
    // loginServer: 'http://119.207.78.146:9090',
    gasList: {},
    errorObj: {},
    receiveGas: {},
    job: undefined,
    timeoutCount: 20000,
    actionRequest(data) {
        const _this = this;
        // let _postURL = _this.loginServer+'/sensor/sensors/action';
        let obj = {};
        obj['sensor_index'] = data['sensor_index'];
        obj['record_time'] = data['record_time'];

        let isErrorTimeProp = data.hasOwnProperty('stop_time');
        if (!isErrorTimeProp) {
            let isUsedTime = data['isUsedTime'];
            if (isUsedTime) {
                obj['action'] = 1;
            } else {
                obj['action'] = 2;
            }
        } else {
            obj['action'] = 0;
        }
        // request.post({
        //     url: _postURL,
        //     body: obj,
        //     json:true}, function(error, res, body){

        // });
    },
    initFindByOnSensor() {
        const _this = this;
        const _query = queryconfig.findByOnSensor(); // start_time이 Null이 아닌 센서 조회(현재 사용 중인 센서)
        pool.getConnection((err, connection) => {
            if (err) {
                console.log(err);
                throw err;
            } else {
                //커넥션 사용
                connection.query(_query, (err, results) => {
                    if (err) {
                        throw err;
                    } else {
                        for (i in results) {
                            const {
                                sensor_index,
                                o2_value,
                                h2s_value,
                                voc_value,
                                comb_value,
                                co_value,
                                o2_state_code,
                                h2s_state_code,
                                voc_state_code,
                                comb_state_code,
                                co_state_code,
                                sensor_start_time,
                                local_index,
                            } = results[i];

                            let valueObj = {
                                O2: o2_value,
                                H2S: h2s_value,
                                VOC: voc_value,
                                COMB: comb_value,
                                CO: co_value,
                                o2_state_code,
                                h2s_state_code,
                                voc_state_code,
                                comb_state_code,
                                co_state_code,
                                local_index,
                            };

                            const initOnSensor = {
                                sensor_index,
                                device_index: 1,
                                start_time: moment(sensor_start_time).format(
                                    'YYYY-MM-DD HH:mm:ss'
                                ),
                                isUsedTime: true,
                                warmingup_time: null,
                                value: valueObj,
                                timeoutId: undefined,
                            };

                            if (
                                !_this.receiveGas.hasOwnProperty(sensor_index)
                            ) {
                                _this.receiveGas[sensor_index] = initOnSensor;
                            }
                        }
                    }
                });
                //커넥션 반환( 커넥션 종료 메소드가 커넥션과 다르다 )
                connection.release();
            }
        });
    },
    findBygas() {
        const _this = this;
        const _query = queryconfig.findBygas();
        //풀에서 컨넥션 획득
        pool.getConnection((err, connection) => {
            if (err) {
                console.log(err);
                throw err;
            } else {
                //커넥션 사용
                connection.query(_query, (err, results) => {
                    if (err) {
                        throw err;
                    } else {
                        for (i in results) {
                            const {
                                sensor_index,
                                gas_id: id,
                                gas_code,
                                gas_name,
                                gas_unit: unit,
                                range_min,
                                range_max,
                                normal_low,
                                normal_high,
                                warning1_low,
                                warning1_high,
                                warning2_low,
                                warning2_high,
                                danger1_low,
                                danger1_high,
                                danger2_low,
                                danger2_high,
                            } = results[i];
                            const sensorIdx = sensor_index;
                            const code = gas_code;
                            const hasIdx =
                                _this.gasList.hasOwnProperty(sensorIdx);

                            if (!hasIdx) {
                                _this.gasList[sensorIdx] = {};
                                _this.gasList[sensorIdx][code] = {
                                    id,
                                    sensor_index,
                                    unit,
                                    range_min,
                                    range_max,
                                    normal_low,
                                    normal_high,
                                    warning1_low,
                                    warning1_high,
                                    warning2_low,
                                    warning2_high,
                                    danger1_low,
                                    danger1_high,
                                    danger2_low,
                                    danger2_high,
                                    normal_range: `${normal_low}-${normal_high}${unit}`,
                                };
                            } else {
                                _this.gasList[sensorIdx][code] = {
                                    id,
                                    sensor_index,
                                    unit,
                                    range_min,
                                    range_max,
                                    normal_low,
                                    normal_high,
                                    warning1_low,
                                    warning1_high,
                                    warning2_low,
                                    warning2_high,
                                    danger1_low,
                                    danger1_high,
                                    danger2_low,
                                    danger2_high,
                                    normal_range: `${normal_low}-${normal_high}${unit}`,
                                };
                            }
                        }
                    }
                });
                //커넥션 반환( 커넥션 종료 메소드가 커넥션과 다르다 )
                connection.release();
            }
        });
    },
    receive(data) {
        const _this = this;
        const { sensor_index: sensorIndex, value } = data;
        const gasList = _this.gasList[sensorIndex];
        const gasObj = value;

        for (gas_type in gasObj) {
            const gasInfo = gasList[gas_type];
            const {
                normal_low: normalLow = null,
                normal_high: normalHigh = null,
                warning1_low: warning1_Low = null,
                warning1_high: warning1_High = null,
                warning2_low: warning2_Low = null,
                warning2_high: warning2_High = null,
                danger1_low: danger1_Low = null,
                danger1_high: danger1_High = null,
                danger2_low: danger2_Low = null,
                danger2_high: danger2_High = null,
            } = gasInfo;
            const value = gasObj[gas_type];
            if (gas_type === 'O2') {
                let o2_stateCode;
                if (
                    (value >= normalLow && value <= normalHigh) ||
                    value === 0
                ) {
                    o2_stateCode = 0;
                } else if (
                    (value > danger1_Low && value <= danger1_High) ||
                    (value > danger2_Low &&
                        value <= danger2_High &&
                        value !== 0)
                ) {
                    o2_stateCode = 2;
                }
                data['value']['o2_state_code'] = o2_stateCode;

                // alarmHandler ///////////////////////////////
                let _gasErrorObj = {
                    gas_type: 'O2',
                    stateCode: o2_stateCode,
                    sensorIndex,
                    recordTime: data['record_time'],
                    value,
                };

                _this.alarmHandler(_gasErrorObj);

                // end alarmHandle ///////////////////////////////////
            } else if (gas_type === 'H2S') {
                let h2s_stateCode;
                if (value >= normalLow && value <= normalHigh) {
                    h2s_stateCode = 0;
                } else if (value >= warning1_Low && value <= warning1_High) {
                    h2s_stateCode = 1;
                } else if (value >= danger1_Low && value <= danger1_High) {
                    h2s_stateCode = 2;
                }

                data['value']['h2s_state_code'] = h2s_stateCode;

                //alarmInsert
                // alarmHandler ///////////////////////////////
                let _gasErrorObj = {
                    gas_type: 'H2S',
                    stateCode: h2s_stateCode,
                    sensorIndex,
                    recordTime: data['record_time'],
                    value,
                };

                _this.alarmHandler(_gasErrorObj);
            } else if (gas_type === 'CO') {
                let co_stateCode;

                if (value >= normalLow && value <= normalHigh) {
                    co_stateCode = 0;
                } else if (value >= warning1_Low && value <= warning1_High) {
                    co_stateCode = 1;
                } else if (value >= danger1_Low && value <= danger1_High) {
                    co_stateCode = 2;
                }

                data['value']['co_state_code'] = co_stateCode;

                //alarmInsert
                // alarmHandler ///////////////////////////////
                let _gasErrorObj = {
                    gas_type: 'CO',
                    stateCode: co_stateCode,
                    sensorIndex,
                    recordTime: data['record_time'],
                    value,
                };

                _this.alarmHandler(_gasErrorObj);
                //////////////////////////////////////////////
            } else if (gas_type === 'VOC') {
                let voc_stateCode;
                if (value >= normalLow && value <= normalHigh) {
                    voc_stateCode = 0;
                } else if (value >= warning1_Low && value <= warning1_High) {
                    voc_stateCode = 1;
                } else if (value >= danger1_Low && value <= danger1_High) {
                    voc_stateCode = 2;
                }

                data['value']['voc_state_code'] = voc_stateCode;

                //alarmInsert
                // alarmHandler ///////////////////////////////
                let _gasErrorObj = {
                    gas_type: 'VOC',
                    stateCode: voc_stateCode,
                    sensorIndex,
                    recordTime: data['record_time'],
                    value,
                };

                _this.alarmHandler(_gasErrorObj);
                //////////////////////////////////////////////
            } else if (gas_type === 'COMB') {
                let comb_stateCode;
                if (value >= normalLow && value <= normalHigh) {
                    comb_stateCode = 0;
                } else if (value >= warning1_Low && value <= warning1_High) {
                    comb_stateCode = 1;
                } else if (value >= danger1_Low && value <= danger1_High) {
                    comb_stateCode = 2;
                }

                data['value']['comb_state_code'] = comb_stateCode;
                //alarmInsert
                // alarmHandler ///////////////////////////////
                let _gasErrorObj = {
                    gas_type: 'COMB',
                    stateCode: comb_stateCode,
                    sensorIndex,
                    recordTime: data['record_time'],
                    value,
                };

                _this.alarmHandler(_gasErrorObj);
                //////////////////////////////////////////////
            }
        }
        //로그 입력 및 상태 업데이트
        console.log('data->', data);

        _this.logInsert(data);

        let hasProperty = _this.receiveGas.hasOwnProperty(sensorIndex);
        if (!hasProperty) {
            console.log('has--->FASLE');
            data['timeoutId'] = setTimeout(() => {
                console.log('POWER OFF!!!');
                _this.receiveGas[sensorIndex]['stop_time'] =
                    data['record_time'];
                let _startTime =
                    _this.receiveGas[sensorIndex]['start_time'] || null;
                if (_startTime) {
                    _this.sensorOff(_this.receiveGas[sensorIndex]);
                } else {
                    _this.sensorOffupdate(sensorIndex);
                }
                delete _this.receiveGas[sensorIndex];
            }, _this.timeoutCount);
            data['isUsedTime'] = false;
            data['warmingup_time'] = data['record_time'];
            _this.receiveGas[sensorIndex] = data;
            const o2Data = data['value']['O2'];
            if (o2Data > 0 || o2Data !== 0) {
                console.log('>>>>>>>>>sensorON!!!!!!!!!!!!');
                _this.sensorOn(data);
                _this.receiveGas[sensorIndex]['isUsedTime'] = true;
            } else {
                _this.actionRequest(_this.receiveGas[sensorIndex]);
            }
        } else {
            if (_this.receiveGas[sensorIndex]['timeoutId']) {
                clearTimeout(_this.receiveGas[sensorIndex]['timeoutId']);
            }
            _this.receiveGas[sensorIndex]['timeoutId'] = setTimeout(() => {
                console.log('POWER OFF!!!');
                _this.receiveGas[sensorIndex]['stop_time'] =
                    data['record_time'];
                let _startTime =
                    _this.receiveGas[sensorIndex]['start_time'] || null;
                if (_startTime) {
                    _this.sensorOff(_this.receiveGas[sensorIndex]);
                } else {
                    _this.sensorOffupdate(sensorIndex);
                }
                delete _this.receiveGas[sensorIndex];
            }, _this.timeoutCount);

            _this.receiveGas[sensorIndex]['value'] = data['value'];
            _this.receiveGas[sensorIndex]['record_time'] = data['record_time'];

            const o2Data = data['value']['O2'];
            const _isUsedTime = _this.receiveGas[sensorIndex]['isUsedTime'];
            const _warmingUp = _this.receiveGas[sensorIndex]['warmingup_time'];
            if ((o2Data > 0 || o2Data !== 0) && !_isUsedTime) {
                console.log('>>>>>>>>>sensorON!!!!!!!!!!!!');
                //data['start_time'] = data['record_time'];
                _this.sensorOn(_this.receiveGas[sensorIndex]);
                _this.receiveGas[sensorIndex]['isUsedTime'] = true;
            } else if (o2Data === 0 && _isUsedTime === true) {
                _this.receiveGas[sensorIndex]['isUsedTime'] = false;
                _this.receiveGas[sensorIndex]['warmingup_time'] =
                    _this.receiveGas[sensorIndex]['record_time'];
                _this.actionRequest(_this.receiveGas[sensorIndex]);
            }
        }
    },
    logInsert(data) {
        //수신 로그 입력
        console.log('data>', data);

        const _this = this;
        let _query = queryconfig.logInsert(data);
        // queryconfig.logInsert(data) + queryconfig.recordUpdate(data);
        //풀에서 컨넥션 획득
        pool.getConnection((err, connection) => {
            if (err) {
                console.log(err);
                throw err;
            } else {
                //커넥션 사용
                connection.query(_query, (err, results) => {
                    if (err) {
                        // throw err;
                        console.error(err);
                    } else {
                    }
                });
                //커넥션 반환( 커넥션 종료 메소드가 커넥션과 다르다 )
                connection.release();
            }
        });
    },
    sensorOn(data) {
        /*
             @action insert
             @paramType json
             @comment 장비 사용 시작
         */
        const _this = this;
        let date = moment().format('YYYY-MM-DD HH:mm:ss');
        data['start_time'] = date;
        data['warmingup_time'] = data['warmingup_time'] || date;
        let sensorIndex = data['sensor_index'];
        _this.receiveGas[sensorIndex]['start_time'] = date;
        let _query = queryconfig.usedHisInsert(data);
        //풀에서 컨넥션 획득
        pool.getConnection((err, connection) => {
            if (err) {
                console.log(err);
                throw err;
            } else {
                //커넥션 사용
                connection.query(_query, (err, results) => {
                    if (err) {
                        throw err;
                    } else {
                        _this.receiveGas[sensorIndex]['warmingup_time'] =
                            undefined;
                        _this.actionRequest(data);
                    }
                });
                //커넥션 반환( 커넥션 종료 메소드가 커넥션과 다르다 )
                connection.release();
            }
        });
    },
    sensorOff(data) {
        const _this = this;
        const sensorIdx = data['sensor_index'];
        const _errObj = _this.errorObj;
        let hasSensorProperty = _errObj.hasOwnProperty(sensorIdx);
        if (hasSensorProperty) {
            const gasErrorObj = _errObj[sensorIdx];
            const errorKeys = Object.keys(gasErrorObj);
            const errorObjLength = errorKeys.length;
            if (errorObjLength > 0) {
                for (let keys in gasErrorObj) {
                    gasErrorObj[keys]['restore_time'] = data['record_time'];

                    _this.alarmUpdate(gasErrorObj[keys]);
                }
            }
        }

        let _query = queryconfig.usedHisUpdate(data);
        pool.getConnection((err, connection) => {
            if (err) {
                console.log(err);
                throw err;
            } else {
                //커넥션 사용
                connection.query(_query, (err, results) => {
                    if (err) {
                        throw err;
                    } else {
                        _this.actionRequest(data);
                        request.post(
                            {
                                url: 'http://http://119.207.78.144:8089/api/networks/gas',
                                body: {
                                    in_index: sensorIdx,
                                    in_start_date: null,
                                    in_stop_date: moment().format(
                                        'YYYY-MM-DD HH:mm:ss'
                                    ),
                                    in_status: 'closed',
                                },
                                json: true,
                            },
                            function (error, res, body) {}
                        );
                    }
                });
                //커넥션 반환( 커넥션 종료 메소드가 커넥션과 다르다 )
                connection.release();
            }
        });
    },
    sensorOffupdate(data) {
        // info_sensor 테이블의 상태 action이 로딩중(2)일 경우, OFF상태(1)로 업데이트 해준다.
        // @parameter data = sensor_index
        const _this = this;

        let _query = queryconfig.sensorOffupdate(data);
        pool.getConnection((err, connection) => {
            if (err) {
                console.log(err);
                throw err;
            } else {
                //커넥션 사용
                connection.query(_query, (err, results) => {
                    if (err) {
                        throw err;
                    } else {
                    }
                });
                //커넥션 반환( 커넥션 종료 메소드가 커넥션과 다르다 )
                connection.release();
            }
        });
    },
    alarmHandler(obj) {
        let _this = this;
        let { stateCode, sensorIndex, recordTime, value, gas_type } = obj;
        let _gasErrorObj = {};
        if (gas_type === 'O2') {
            if (stateCode === 2) {
                _gasErrorObj['gas_type'] = gas_type;
                _gasErrorObj['record_time'] = recordTime;
                _gasErrorObj['sensor_index'] = sensorIndex;
                _gasErrorObj['device_index'] = 1;
                _gasErrorObj['state_code'] = stateCode;
                _gasErrorObj['value'] = value;
                _gasErrorObj['danger_record_time'] = null;

                _this.alarmInsert(_gasErrorObj);

                let maxValue =
                    _this.errorObj[sensorIndex][gas_type]['max_value'];
                if (value < 18 && value < maxValue) {
                    _this.errorObj[sensorIndex][gas_type]['max_record_time'] =
                        recordTime;
                    _this.errorObj[sensorIndex][gas_type]['max_value'] = value;
                } else if (value > 23.5 && value > maxValue) {
                    _this.errorObj[sensorIndex][gas_type]['max_value'] = value;
                    _this.errorObj[sensorIndex][gas_type]['max_record_time'] =
                        recordTime;
                }
            } else if (stateCode === 0) {
                let hasSensorProperty =
                    _this.errorObj.hasOwnProperty(sensorIndex);
                if (hasSensorProperty) {
                    let hasProperty =
                        _this.errorObj[sensorIndex].hasOwnProperty(gas_type);
                    if (hasProperty) {
                        _this.errorObj[sensorIndex][gas_type]['restore_time'] =
                            recordTime;
                        _this.alarmUpdate(
                            _this.errorObj[sensorIndex][gas_type]
                        );
                    }
                }
            }
        } else {
            _gasErrorObj['gas_type'] = gas_type;
            _gasErrorObj['record_time'] = recordTime;
            _gasErrorObj['sensor_index'] = sensorIndex;
            _gasErrorObj['device_index'] = 1;
            _gasErrorObj['state_code'] = stateCode;
            _gasErrorObj['danger_record_time'] = null;
            _gasErrorObj['danger_restore_time'] = null;
            _gasErrorObj['value'] = value;

            if (stateCode === 2) {
                let hasSensorProperty =
                    _this.errorObj.hasOwnProperty(sensorIndex);
                if (hasSensorProperty) {
                    let hasProperty =
                        _this.errorObj[sensorIndex].hasOwnProperty(gas_type);
                    if (hasProperty) {
                        let _errorObj = _this.errorObj[sensorIndex][gas_type];
                        _errorObj['state_code'] = 2;
                        if (!_errorObj['danger_record_time']) {
                            _errorObj['record_time'] = _errorObj['record_time']
                                ? _errorObj['record_time']
                                : recordTime;
                            _errorObj['danger_record_time'] = recordTime;
                            _this.errorObj[sensorIndex][gas_type][
                                'danger_restore_time'
                            ] = null;
                            _this.errorObj[sensorIndex][gas_type][
                                'init_value'
                            ] = value;
                            _this.alarmWarningToDanger(_errorObj);
                        }
                        let maxValue =
                            _this.errorObj[sensorIndex][gas_type]['max_value'];
                        if (value > maxValue) {
                            _this.errorObj[sensorIndex][gas_type]['max_value'] =
                                value;
                            _this.errorObj[sensorIndex][gas_type][
                                'max_record_time'
                            ] = recordTime;
                        }
                    } else {
                        _gasErrorObj['danger_record_time'] = recordTime;
                        _this.alarmInsert(_gasErrorObj);
                    }
                } else {
                    _gasErrorObj['danger_record_time'] = recordTime;
                    _this.alarmInsert(_gasErrorObj);
                }
            }
            if (stateCode === 1) {
                let hasSensorProperty =
                    _this.errorObj.hasOwnProperty(sensorIndex);
                if (hasSensorProperty) {
                    let hasGasProp =
                        _this.errorObj[sensorIndex].hasOwnProperty(gas_type);
                    if (hasGasProp) {
                        let _errorObj = _this.errorObj[sensorIndex][gas_type];
                        let stateCode = _errorObj['state_code'];
                        if (stateCode === 2) {
                            if (!_errorObj['danger_restore_time']) {
                                _errorObj['danger_restore_time'] = recordTime;
                                console.log('위험-> 경고');
                                _this.alarmDangerToWarning(_errorObj);
                            }
                        }
                        let maxValue =
                            _this.errorObj[sensorIndex][gas_type]['max_value'];
                        if (value > maxValue) {
                            _this.errorObj[sensorIndex][gas_type]['max_value'] =
                                value;
                            _this.errorObj[sensorIndex][gas_type][
                                'max_record_time'
                            ] = recordTime;
                        }
                    } else {
                        _this.alarmInsert(_gasErrorObj);
                    }
                } else {
                    _this.alarmInsert(_gasErrorObj);
                }
            } else if (stateCode === 0) {
                let hasSensorProperty =
                    _this.errorObj.hasOwnProperty(sensorIndex);
                if (hasSensorProperty) {
                    let hasProperty =
                        _this.errorObj[sensorIndex].hasOwnProperty(gas_type);
                    if (hasProperty) {
                        _this.errorObj[sensorIndex][gas_type]['restore_time'] =
                            recordTime;
                        _this.alarmUpdate(
                            _this.errorObj[sensorIndex][gas_type]
                        );
                    }
                }
            }
        }
    },
    alarmInsert(data) {
        const _this = this;
        const {
            gas_type,
            record_time,
            sensor_index,
            value,
            state_code,
            device_index,
        } = data;
        const _recordTime = moment(record_time).format('YYYY-MM-DD HH:mm:ss');

        let hasProperty = _this.errorObj.hasOwnProperty(sensor_index);
        if (!hasProperty) {
            _this.errorObj[sensor_index] = {};
            _this.errorObj[sensor_index][gas_type] = {
                gas_type,
                record_time: _recordTime,
                sensor_index,
                device_index,
                gas_type,
                state_code,
                init_value: value,
                max_value: value,
                max_record_time: _recordTime,
                restore_time: undefined,
                danger_record_time: state_code === 2 ? _recordTime : undefined,
            };

            let _query;
            if (gas_type === 'O2') {
                _this.errorObj[sensor_index][gas_type]['danger_record_time'] =
                    _recordTime;
                _query = queryconfig.alarmHisInsertByO2(
                    _this.errorObj[sensor_index][gas_type]
                );
            } else {
                _query = queryconfig.alarmHisInsert(
                    _this.errorObj[sensor_index][gas_type]
                );
            }
            pool.getConnection((err, connection) => {
                if (err) {
                    console.log(err);
                    throw err;
                } else {
                    //커넥션 사용
                    connection.query(_query, (err, results) => {
                        if (err) {
                            throw err;
                        } else {
                            if (state_code === 2)
                                _this.receiverList(
                                    _this.errorObj[sensor_index][gas_type]
                                );
                        }
                    });
                    //커넥션 반환( 커넥션 종료 메소드가 커넥션과 다르다 )
                    connection.release();
                }
            });
        } else {
            let hasGasProperty =
                _this.errorObj[sensor_index].hasOwnProperty(gas_type);
            if (!hasGasProperty) {
                _this.errorObj[sensor_index][gas_type] = {
                    gas_type,
                    record_time: _recordTime,
                    sensor_index,
                    device_index,
                    gas_type,
                    state_code,
                    init_value: value,
                    max_value: value,
                    max_record_time: _recordTime,
                    restore_time: undefined,
                    danger_record_time: data['danger_record_time'] || null,
                };
                if (gas_type === 'O2') {
                    _this.errorObj[sensor_index][gas_type][
                        'danger_record_time'
                    ] = _recordTime;
                    _query = queryconfig.alarmHisInsertByO2(
                        _this.errorObj[sensor_index][gas_type]
                    );
                } else {
                    _query = queryconfig.alarmHisInsert(
                        _this.errorObj[sensor_index][gas_type]
                    );
                }
                pool.getConnection((err, connection) => {
                    if (err) {
                        console.log(err);
                        throw err;
                    } else {
                        //커넥션 사용
                        connection.query(_query, (err, results) => {
                            if (err) {
                                throw err;
                            } else {
                            }
                        });
                        //커넥션 반환( 커넥션 종료 메소드가 커넥션과 다르다 )
                        connection.release();
                    }
                });
            }
            // else {
            //     let maxValue = _this.errorObj[sensor_index][gas_type]['max_value'];
            //     let value = data['value'];
            //     if(gas_type === 'O2'){
            //         if(value<18 && value<maxValue){
            //             _this.errorObj[sensor_index][gas_type]['max_record_time'] = data['record_time'];
            //             _this.errorObj[sensor_index][gas_type]['max_value'] = value;
            //         }
            //         else if(value>23.5 && value>maxValue){
            //             _this.errorObj[sensor_index][gas_type]['max_value'] = value;
            //             _this.errorObj[sensor_index][gas_type]['max_record_time'] = data['record_time'];
            //         }
            //     } else {
            //         if (value > maxValue) {
            //             _this.errorObj[sensor_index][gas_type]['max_value'] = value;
            //             _this.errorObj[sensor_index][gas_type]['max_record_time'] = data['record_time'];
            //         }
            //     }
            // }
        }
    },
    alarmWarningToDanger(data) {
        let _this = this;
        let { sensor_index, gas_type } = data;
        let _query = queryconfig.alarmHisWarningToDanger(data);
        _this.receiverList(_this.errorObj[sensor_index][gas_type]);
        pool.getConnection((err, connection) => {
            if (err) {
                console.log(err);
                throw err;
            } else {
                //커넥션 사용
                connection.query(_query, (err, results) => {
                    if (err) {
                        throw err;
                    } else {
                        console.log('경고---> 위험');
                    }
                });
                //커넥션 반환( 커넥션 종료 메소드가 커넥션과 다르다 )
                connection.release();
            }
        });
    },
    alarmDangerToWarning(data) {
        let _query = queryconfig.alarmHisDangerToWarning(data);
        pool.getConnection((err, connection) => {
            if (err) {
                console.log(err);
                throw err;
            } else {
                //커넥션 사용
                connection.query(_query, (err, results) => {
                    if (err) {
                        throw err;
                    } else {
                        console.log('111.위험--->경고');
                    }
                });
                //커넥션 반환( 커넥션 종료 메소드가 커넥션과 다르다 )
                connection.release();
            }
        });
    },
    alarmUpdate(data) {
        const _this = this;
        const { sensor_index, gas_type, record_time, state_code } = data;
        let _query;
        if (gas_type === 'O2') {
            _this.errorObj[sensor_index][gas_type]['danger_restore_time'] =
                moment().format('YYYY-MM-DD HH:mm:ss');
            _query = queryconfig.alarmHisRestoreByO2(data);
        } else {
            //  let _hasDangerRestoreProp = _this.errorObj[sensor_index][gas_type].hasOwnProperty('danger_restore_time');
            //  if(!_hasDangerRestoreProp){
            //     _this.errorObj[sensor_index][gas_type]['danger_restore_time'] = data['record_time']
            //  }

            if (state_code === 2) {
                let _hasDangerRestoreProp = _this.errorObj[sensor_index][
                    gas_type
                ].hasOwnProperty('danger_restore_time');
                if (!_hasDangerRestoreProp) {
                    _this.errorObj[sensor_index][gas_type][
                        'danger_restore_time'
                    ] = moment().format('YYYY-MM-DD HH:mm:ss');
                }
            }
            _query = queryconfig.alarmHisRestore(data);
        }
        pool.getConnection((err, connection) => {
            if (err) {
                console.log(err);
                throw err;
            } else {
                //커넥션 사용
                connection.query(_query, (err, results) => {
                    if (err) {
                        throw err;
                    } else {
                        delete _this.errorObj[sensor_index][gas_type];
                        const errorLength = Object.keys(
                            _this.errorObj[sensor_index]
                        ).length;
                        if (errorLength === 0)
                            delete _this.errorObj[sensor_index];
                    }
                });
                //커넥션 반환( 커넥션 종료 메소드가 커넥션과 다르다 )
                connection.release();
            }
        });
    },
    backupOfDay() {
        let recordDate = moment().format('YYYY-MM-DD');
        // const _query = queryconfig.fileBackup(recordDate);
        const _query =
            queryconfig.fileBackup(recordDate) + queryconfig.gasLogDelete();
        pool.getConnection((err, connection) => {
            if (err) {
                console.log(err);
                connection.release();
                throw err;
            } else {
                //커넥션 사용
                connection.query(_query, (err, results) => {
                    if (err) {
                        throw err;
                    }
                });
                //커넥션 반환( 커넥션 종료 메소드가 커넥션과 다르다 )
                connection.release();
            }
        });
    },
    receiverList(data) {
        const _this = this;
        const { sensor_index, gas_type, record_time, state_code, init_value } =
            data;
        const sensorIndex = sensor_index;
        const gasType = gas_type.toUpperCase();
        const recordTime = record_time;

        const _gasObj = _this.gasList[sensorIndex][gasType];
        const { normal_range, unit } = _gasObj;
        const _query = queryconfig.receiverList(sensorIndex);
        console.log(_query);
        pool.getConnection((err, connection) => {
            if (err) {
                console.log(err);
                throw err;
            } else {
                //커넥션 사용
                connection.query(_query, (err, results) => {
                    if (err) {
                        throw err;
                    } else {
                        let tempArr = [];
                        for (i in results) {
                            const {
                                wk_name,
                                wk_phone,
                                sensor_name,
                                local_name,
                            } = results[i];
                            const sendObj = {
                                name: wk_name,
                                tel: wk_phone,
                                record_time: recordTime.split('.')[0],
                                sensor_name: sensor_name,
                                gas_type: gasType,
                                state_code,
                                init_value,
                                normal_range,
                                unit,
                                sensor_name,
                                local_name,
                            };
                            tempArr.push(sendObj);
                            _this.smsSend(sendObj);
                        }
                    }
                });
                //커넥션 반환( 커넥션 종료 메소드가 커넥션과 다르다 )
                connection.release();
            }
        });
    },
    smsSend(obj) {
        const _postURL = `${process.env.SMS_SERVER}/alarm/iggas/danger`;
        request.post(
            {
                url: _postURL,
                body: obj,
                json: true,
            },
            function (error, res, body) {}
        );
    },
};

module.exports = receiver;
