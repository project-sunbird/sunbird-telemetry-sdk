/**
 * This is responsible for syncing of Telemetry
 * @class TelemetrySyncManager
 * @author Manjunath Davanam <manjunathd@ilimi.in>
 * @author Krushanu Mohapatra <Krushanu.Mohapatra@tarento.com>
 */

var TelemetrySyncManager = {

    /**
     * This is the telemetry data for the perticular stage.
     * @member {object} _teleData
     * @memberof TelemetryPlugin
     */
    _teleData: [],
    _failedBatch: [],
    init: function() {
        var instance = this;
        document.addEventListener('TelemetryEvent', this.sendTelemetry);
    },
    sendTelemetry: function(event) {
        var telemetryEvent = event.detail;
        var instance = TelemetrySyncManager;
        console.log("Telemetry Events ", JSON.stringify(telemetryEvent));
        instance._teleData.push(Object.assign({}, telemetryEvent));
        if ((telemetryEvent.eid.toUpperCase() === "END") || (instance._teleData.length >= Telemetry.config.batchsize)) {
            TelemetrySyncManager.syncEvents();
        }
    },
    syncEvents: function(telemetryObj) {
        var Telemetry = EkTelemetry || Telemetry;
        var instance = TelemetrySyncManager;
        if(!telemetryObj){
            var telemetryEvents = instance._teleData.splice(0, Telemetry.config.batchsize);
            if(!telemetryEvents.length){
                return;
            }
            telemetryObj = {
                "id": "ekstep.telemetry",
                "ver": Telemetry._version,
                "params": {
                    "msgid": CryptoJS.MD5(JSON.stringify(telemetryEvents)).toString(),
                },
                "ets": (new Date()).getTime(),
                "events": telemetryEvents
            };
        }
        var headersParam = {};
        if ('undefined' != typeof Telemetry.config.authtoken)
            headersParam["Authorization"] = 'Bearer ' + Telemetry.config.authtoken;
        var fullPath = Telemetry.config.host + Telemetry.config.apislug + Telemetry.config.endpoint;
        headersParam['dataType'] = 'json';
        headersParam["Content-Type"] = "application/json";
        jQuery.ajax({
            url: fullPath,
            type: "POST",
            headers: headersParam,
            data: JSON.stringify(telemetryObj)
        }).done(function(resp) {
            console.log("Telemetry API success", resp);
        }).fail(function(error, textStatus, errorThrown) {
            instance._failedBatch.push(telemetryObj);
            if (error.status == 403) {
                console.error("Authentication error: ", error);
            } else {
                console.log("Error while Telemetry sync to server: ", error);
            }
        });
    },
    syncFailedBatch: function(){
        var instance = TelemetrySyncManager;
        if(!instance._failedBatch.length){
            return;
        }
        console.log('syncing failed telemetry batch');
        var telemetryObj = instance._failedBatch.splice(0, 1);
        instance.syncEvents(telemetryObj[0]);
    }
}
if (typeof document != 'undefined') {
    TelemetrySyncManager.init();
    setInterval(function(){
        TelemetrySyncManager.syncFailedBatch();
    }, 5000)
}