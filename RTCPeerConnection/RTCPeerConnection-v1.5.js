/*
     2013, @muazkh - github.com/muaz-khan
     MIT License - https://webrtc-experiment.appspot.com/licence/
     Documentation - https://github.com/muaz-khan/WebRTC-Experiment/tree/master/RTCPeerConnection
*/

window.moz = !! navigator.mozGetUserMedia;
var RTCPeerConnection = function (options) {
    var w = window,
        PeerConnection = w.mozRTCPeerConnection || w.webkitRTCPeerConnection,
        SessionDescription = w.mozRTCSessionDescription || w.RTCSessionDescription,
        IceCandidate = w.mozRTCIceCandidate || w.RTCIceCandidate;

    var STUN = {
        url: !moz ? 'stun:stun.l.google.com:19302' : 'stun:23.21.150.121'
    };

    var TURN = {
        url: 'turn:homeo@turn.bistri.com:80',
        credential: 'homeo'
    };

    var iceServers = {
        iceServers: options.iceServers || [STUN]
    };

    if (!moz && !options.iceServers) {
        if (parseInt(navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./)[2]) >= 28)
            TURN = {
                url: 'turn:turn.bistri.com:80',
                credential: 'homeo',
                username: 'homeo'
            };

        iceServers.iceServers = [STUN, TURN];
    }

    var optional = {
        optional: []
    };

    if (!moz) {
        optional.optional = [{
            DtlsSrtpKeyAgreement: true
        }];

        if (options.onChannelMessage)
            optional.optional = [{
                RtpDataChannels: true
            }];
    }

    var peerConnection = new PeerConnection(iceServers, optional);

    openOffererChannel();

    peerConnection.onicecandidate = onicecandidate;
    if (options.attachStream) peerConnection.addStream(options.attachStream);
    peerConnection.onaddstream = onaddstream;

    function onicecandidate(event) {
        if (!event.candidate || !peerConnection) return;
        if (options.onICE) options.onICE(event.candidate);
    }

    var remoteStreamEventFired = false;

    function onaddstream(event) {
        info('------------onaddstream');
        if (remoteStreamEventFired || !event || !options.onRemoteStream) return;
        remoteStreamEventFired = true;
        options.onRemoteStream(event.stream);
    }

    var constraints = options.constraints || {
        optional: [],
        mandatory: {
            OfferToReceiveAudio: true,
            OfferToReceiveVideo: true
        }
    };

    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
        extractedChars = '';

    function getChars() {
        extractedChars += chars[parseInt(Math.random() * 40)] || '';
        if (extractedChars.length < 40) getChars();

        return extractedChars;
    }

    function getInteropSDP(sdp) {
        // for audio-only streaming: multiple-crypto lines are not allowed
        if (options.onAnswerSDP)
            sdp = sdp.replace(/(a=crypto:0 AES_CM_128_HMAC_SHA1_32)(.*?)(\r\n)/g, '');


        var inline = getChars() + '\r\n' + (extractedChars = '');
        sdp = sdp.indexOf('a=crypto') == -1 ? sdp.replace(/c=IN/g,
            'a=crypto:1 AES_CM_128_HMAC_SHA1_80 inline:' + inline +
            'c=IN') : sdp;

        sdp = setBandwidth(sdp);

        if (options.offerSDP) {
            info('\n--------offer sdp provided by offerer\n');
            info(options.offerSDP.sdp);
        }

        info(options.onOfferSDP ? '\n--------offer\n' : '\n--------answer\n');
        info('sdp: ' + sdp);

        return sdp;
    }

    function createOffer() {
        if (!options.onOfferSDP) return;

        peerConnection.createOffer(function (sessionDescription) {
            sessionDescription.sdp = getInteropSDP(sessionDescription.sdp);
            peerConnection.setLocalDescription(sessionDescription);
            options.onOfferSDP(sessionDescription);
        }, null, constraints);
    }

    function createAnswer() {
        if (!options.onAnswerSDP) return;

        options.offerSDP = new SessionDescription(options.offerSDP);
        peerConnection.setRemoteDescription(options.offerSDP);

        peerConnection.createAnswer(function (sessionDescription) {
            sessionDescription.sdp = getInteropSDP(sessionDescription.sdp);
            peerConnection.setLocalDescription(sessionDescription);
            options.onAnswerSDP(sessionDescription);
        }, null, constraints);
    }

    function setBandwidth(sdp) {
        // Firefox has no support of "b=AS"
        if (moz) return sdp;

        // remove existing bandwidth lines
        sdp = sdp.replace(/b=AS([^\r\n]+\r\n)/g, '');

        sdp = sdp.replace(/a=mid:audio\r\n/g, 'a=mid:audio\r\nb=AS:50\r\n');
        sdp = sdp.replace(/a=mid:video\r\n/g, 'a=mid:video\r\nb=AS:256\r\n');
        sdp = sdp.replace(/a=mid:data\r\n/g, 'a=mid:data\r\nb=AS:1638400\r\n');

        return sdp;
    }

    if ((options.onChannelMessage && !moz) || !options.onChannelMessage) {
        createOffer();
        createAnswer();
    }

    var channel;

    function openOffererChannel() {
        if (!options.onChannelMessage || (moz && !options.onOfferSDP)) return;

        _openOffererChannel();

        if (moz && !options.attachStream) {
            navigator.mozGetUserMedia({
                audio: true,
                fake: true
            }, function (stream) {
                peerConnection.addStream(stream);
                createOffer();
            }, useless);
        }
    }

    function _openOffererChannel() {
        channel = peerConnection.createDataChannel(
            options.channel || 'RTCDataChannel',
            moz ? {} : {
                reliable: false
            });

        if (moz) channel.binaryType = 'blob';
        setChannelEvents();
    }

    function setChannelEvents() {
        channel.onmessage = function (event) {
            if (options.onChannelMessage) options.onChannelMessage(event);
        };

        channel.onopen = function () {
            if (options.onChannelOpened) options.onChannelOpened(channel);
        };
        channel.onclose = function (event) {
            if (options.onChannelClosed) options.onChannelClosed(event);

            console.warn('WebRTC DataChannel closed', event);
        };
        channel.onerror = function (event) {
            console.error(event);
            if (options.onChannelError) options.onChannelError(event);
        };
    }

    if (options.onAnswerSDP && moz) openAnswererChannel();

    function openAnswererChannel() {
        peerConnection.ondatachannel = function (_channel) {
            channel = _channel;
            channel.binaryType = 'blob';
            setChannelEvents();
        };

        if (moz && !options.attachStream) {
            navigator.mozGetUserMedia({
                audio: true,
                fake: true
            }, function (stream) {
                peerConnection.addStream(stream);
                createAnswer();
            }, useless);
        }
    }

    function useless() {}

    function info(information) {
        console.log(information);
    }

    return {
        addAnswerSDP: function (sdp) {
            info('--------adding answer sdp:');
            info(sdp.sdp);

            sdp = new SessionDescription(sdp);
            peerConnection.setRemoteDescription(sdp);
        },
        addICE: function (candidate) {
            info(candidate.candidate);
            peerConnection.addIceCandidate(new IceCandidate({
                sdpMLineIndex: candidate.sdpMLineIndex,
                candidate: candidate.candidate
            }));
        },

        peer: peerConnection,
        channel: channel,
        sendData: function (message) {
            channel && channel.send(message);
        }
    };
};

var video_constraints = {
    mandatory: {},
    optional: []
};

function getUserMedia(options) {
    var n = navigator,
        media;
    n.getMedia = n.webkitGetUserMedia || n.mozGetUserMedia;
    n.getMedia(options.constraints || {
        audio: true,
        video: video_constraints
    }, streaming, options.onerror || function (e) {
        console.error(e);
    });

    function streaming(stream) {
        var video = options.video;
        if (video) {
            video[moz ? 'mozSrcObject' : 'src'] = moz ? stream : window.webkitURL.createObjectURL(stream);
            video.play();
        }
        options.onsuccess && options.onsuccess(stream);
        media = stream;
    }

    return media;
}
