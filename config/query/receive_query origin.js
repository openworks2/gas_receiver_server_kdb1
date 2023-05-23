const _query = {
    findBySensor() {
        const query = 'SELECT * FROM info_sensor_view;';
        return query;
    },
    findByOnSensor() {
        const query = 'SELECT * FROM info_sensor_view GROUP BY sensor_index;';
        // const query = 'SELECT * FROM info_sensor WHERE sensor_action=1;';
        return query;
    },
    sensorOffupdate(data) {
        const _sensorIndex = data;
        const query = `UPDATE info_sensor 
                    SET 
                        sensor_action = 0
                    WHERE sensor_index="${_sensorIndex}";`;
        return query;
    },
    findBygas() {
        /*
            @table sensor_log
            @action get
            @paramType json
            @comment 가스 정보 조회
        */
        var query = 'SELECT * FROM info_gastype;';

        return query;
    },
    logInsert(data) {
        /*
            @table sensor_log
            @action insert
            @paramType json
            @comment 수신 가스 로그 입력
        */
        const {
            record_time = null,
            sensor_index = null,
            device_index = null,
            value,
        } = data;
        const o2Value = value?.O2 || 0;
        const o2StateCode = value?.o2_state_code || 0;
        const h2sValue = value?.H2S || 0;
        const h2sStateCode = value?.h2s_state_code || 0;
        const coValue = value?.CO || 0;
        const coStateCode = value.co_state_code || 0;
        const vocValue = value?.VOC || 0;
        const vocStateCode = value?.voc_state_code || 0;
        const combValue = value?.COMB || 0;
        const combStateCode = value?.comb_state_code || 0;
        const query = `INSERT INTO sensor_log (record_time, sensor_index, device_index, 
            o2_value, o2_state_code, h2s_value, h2s_state_code,
            co_value, co_state_code, voc_value, voc_state_code,
            comb_value, comb_state_code) VALUES (
                "${record_time}", "${sensor_index}", ${device_index}, 
                ${o2Value}, ${o2StateCode}, ${h2sValue}, ${h2sStateCode},
                ${coValue}, ${coStateCode}, ${vocValue}, ${vocStateCode},
                ${combValue}, ${combStateCode}
                );`;
        return query;
    },
    recordUpdate(data) {
        /*
            @table info_sensor
            @action update
            @paramType json
            @comment 수신 가스 측정값 및 상태 업데이트
        */
        const { record_time = null, sensor_index = null, value } = data;

        let action = 2;
        if (value?.O2 !== 0) {
            action = 1;
        }
        const o2Value = value?.O2 || 0;
        const o2StateCode = value?.o2_state_code || 0;
        const h2sValue = value?.H2S;
        const h2sStateCode = value?.h2s_state_code;
        const coValue = value?.CO;
        const coStateCode = value?.co_state_code;
        const vocValue = value?.VOC;
        const vocStateCode = value?.voc_state_code;
        const combValue = value?.COMB;
        const combStateCode = value?.comb_state_code;

        const query = `UPDATE info_sensor SET 
                    record_time="${record_time}", 
                    o2_value=${o2Value}, o2_state_code=${o2StateCode},
                    h2s_value=${h2sValue}, h2s_state_code=${h2sStateCode},
                    co_value=${coValue}, co_state_code=${coStateCode},
                    voc_value=${vocValue}, voc_state_code=${vocStateCode},
                    comb_value=${combValue}, comb_state_code=${combStateCode},
                    sensor_action=${action}
                    WHERE sensor_index="${sensor_index}";`;
        return query;
    },
    usedHisInsert(data) {
        /*
            @table used_his
            @action insert
            @paramType json
            @comment 장비 사용 시작
        */
        const {
            start_time = null,
            sensor_index = null,
            warmingup_time = null,
        } = data;

        const query = `INSERT INTO used_his (start_time, sensor_index, warmingup_time) 
                       VALUES ("${start_time}", "${sensor_index}", "${warmingup_time}");`;
        return query;
    },
    usedHisUpdate(data) {
        /*
            @table used_his
            @action update
            @paramType json
            @comment 장비 사용 종료
        */
        const { sensor_index, start_time, stop_time, value } = data;
        const o2Value = value?.O2;
        const o2StateCode = value?.o2_state_code || 0;
        const h2sValue = value?.H2S;
        const h2sStateCode = value?.h2s_state_code;
        const coValue = value?.CO;
        const coStateCode = value?.co_state_code;
        const vocValue = value?.VOC;
        const vocStateCode = value?.voc_state_code;
        const combValue = value?.COMB;
        const combStateCode = value?.comb_state_code;

        const query = `UPDATE used_his SET 
                    stop_time="${stop_time}", 
                    o2_value=${o2Value}, o2_state_code=${o2StateCode}, 
                    h2s_value=${h2sValue}, h2s_state_code=${h2sStateCode},
                    co_value=${coValue}, co_state_code=${coStateCode}, 
                    voc_value=${vocValue}, voc_state_code=${vocStateCode},
                    comb_value=${combValue}, comb_state_code=${combStateCode} 
                    WHERE id = (
                        SELECT 
                            temp.id 
                        FROM (
                            SELECT MAX(id) AS id FROM used_his 
                            GROUP BY sensor_index 
                            HAVING sensor_index="${sensor_index}"
                        ) temp
                    );`;
        return query;
    },
    gasLogDelete() {
        const query = `TRUNCATE TABLE sensor_log;`;
        return query;
    },
    alarmHisInsert(data) {
        const {
            record_time = null,
            sensor_index = null,
            device_index = null,
            init_value = null,
            state_code = null,
            gas_type = null,
            danger_record_time = null,
        } = data;
        const query = `INSERT INTO log_gas_alarm 
                    (record_time, sensor_index, init_value, device_index, state_code, gas_type, dan_record_time) 
                    VALUES ( "${record_time}", "${sensor_index}", ${init_value}, ${device_index}, 
                        ${state_code}, "${gas_type}", ${
            danger_record_time ? `"${danger_record_time}"` : null
        });`;
        return query;
    },
    alarmHisInsertByO2(data) {
        const {
            record_time = null,
            danger_record_time = null,
            sensor_index = null,
            device_index = null,
            init_value = null,
            gas_type = null,
            state_code = null,
        } = data;

        const query = `INSERT INTO log_gas_alarm 
                    (record_time, sensor_index, init_value, device_index, state_code, gas_type, dan_record_time) 
                    VALUES ( "${record_time}", "${sensor_index}", ${init_value}, "${device_index}", ${state_code}, "${gas_type}", "${danger_record_time}");`;
        return query;
    },
    alarmHisWarningToDanger(data) {
        // 경고-> 위험
        const {
            record_time = null,
            sensor_index = null,
            danger_record_time = null,
            state_code = 0,
        } = data;

        const query = `UPDATE log_gas_alarm SET 
                        dan_record_time = "${danger_record_time}",
                        state_code = ${state_code}
                    WHERE sensor_index="${sensor_index}" AND record_time="${record_time}";`;
        return query;
    },
    alarmHisDangerToWarning(data) {
        //위험 -> 경고
        const {
            record_time = null,
            sensor_index = null,
            danger_restore_time = null,
        } = data;

        const query = `UPDATE log_gas_alarm SET 
                        dan_restore_time = "${danger_restore_time}"
                    WHERE sensor_index="${sensor_index}" AND record_time="${record_time}";`;
        return query;
    },
    alarmHisRestore(data) {
        const {
            record_time = null,
            restore_time = null,
            danger_record_time = null,
            danger_restore_time,
            sensor_index = null,
            max_value = 0,
            max_record_time,
            gas_type,
        } = data;
        console.log('alarmHisRestore->', data);
        const query = `UPDATE log_gas_alarm SET 
                        restore_time="${restore_time}", 
                        dan_restore_time=${
                            danger_restore_time
                                ? `"${danger_restore_time}"`
                                : null
                        }, 
                        max_value=${max_value}, 
                        max_record_time="${max_record_time}" 
                    WHERE sensor_index="${sensor_index}" AND record_time = "${record_time}" AND gas_type = "${gas_type}";`;

        return query;
    },
    alarmHisRestoreByO2(data) {
        const {
            record_time = null,
            danger_record_time = null,
            danger_restore_time,
            sensor_index = null,
            max_value = 0,
            max_record_time = null,
            restore_time,
        } = data;
        const query = `UPDATE log_gas_alarm SET 
                        dan_restore_time=${
                            danger_restore_time
                                ? `"${danger_restore_time}"`
                                : null
                        },  
                        max_value=${max_value}, 
                        max_record_time="${max_record_time}",
                        restore_time="${restore_time}" 
                    WHERE sensor_index="${sensor_index}" AND record_time="${record_time}";`;
        return query;
    },
    fileBackup(recordDate) {
        const logDate = recordDate;

        const query = `SELECT 'id', 'record_time', 'device_index', 'sensor_index', 
                            'o2_value', 'o2_state_code', 'h2s_value', 'h2s_state_code'
                            'co_value', 'co_state_code', 'voc_value', 'voc_state_code', 'comb_value', 'comb_state_code'
                    UNION ALL
                    SELECT id, record_time, device_index, sensor_index, 
                           o2_value, o2_state_code, h2s_value, h2s_state_code
                           co_value, co_state_code, voc_value, voc_state_code, comb_value, comb_state_code
                    INTO OUTFILE 'C:/gasLog/gasLog_${logDate}.csv'
                    FIELDS TERMINATED BY ','
                    ENCLOSED BY '"'
                    LINES TERMINATED BY '\n' 
                    FROM sensor_log;`;
        return query;
    },
    gasLogDelete() {
        var query = `TRUNCATE TABLE sensor_log;`;
        return query;
    },
    // receiverList(data) {
    //     const sensorIdx = data;
    //     const query = `SELECT id, name, tel, sms_yn, sensor_name FROM receiver WHERE sensor_index="${sensorIdx}";`;
    //     return query;
    // },
    receiverList(data) {
        const sensorIdx = data;
        const query = `SELECT * FROM info_receiver_view WHERE sensor_index="${sensorIdx}";`;
        return query;
    },
};

module.exports = _query;
