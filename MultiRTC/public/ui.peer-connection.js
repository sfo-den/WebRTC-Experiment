// https://www.webrtc-experiment.com:12034/

var rtcMultiConnection = new RTCMultiConnection();

rtcMultiConnection.session = { data: true };

rtcMultiConnection.sdpConstraints.mandatory = {
    OfferToReceiveAudio: true,
    OfferToReceiveVideo: true
};

rtcMultiConnection.customStreams = {};

/*
// http://www.rtcmulticonnection.org/docs/fakeDataChannels/
rtcMultiConnection.fakeDataChannels = true;
if(rtcMultiConnection.UA.Firefox) {
rtcMultiConnection.session.data = true;
}
*/

rtcMultiConnection.autoTranslateText = false;

rtcMultiConnection.onopen = function(e) {
    getElement('#allow-webcam').disabled = false;
    getElement('#allow-mic').disabled = false;
    getElement('#share-files').disabled = false;
    getElement('#allow-screen').disabled = false;

    addNewMessage({
        header: e.extra.username,
        message: 'Data connection is opened between you and ' + e.extra.username + '.',
        userinfo: getUserinfo(rtcMultiConnection.blobURLs[rtcMultiConnection.userid], 'images/info.png'),
		color: e.extra.color
    });

    numbersOfUsers.innerHTML = parseInt(numbersOfUsers.innerHTML) + 1;
};

var whoIsTyping = document.querySelector('#who-is-typing');
rtcMultiConnection.onmessage = function(e) {
	if(e.data.typing) {
		whoIsTyping.innerHTML = e.extra.username + ' is typing ...';
		return;
	}
    
    if(e.data.stoppedTyping) {
        whoIsTyping.innerHTML = '';
        return;
    }
    
	whoIsTyping.innerHTML = '';
	
    addNewMessage({
        header: e.extra.username,
        message: 'Text message from ' + e.extra.username + ':<br /><br />' + (rtcMultiConnection.autoTranslateText ? linkify(e.data) + ' ( ' + linkify(e.original) + ' )' : linkify(e.data)),
        userinfo: getUserinfo(rtcMultiConnection.blobURLs[e.userid], 'images/chat-message.png'),
        color: e.extra.color
    });
    document.title = e.data;
};

rtcMultiConnection.init = function() {
    rtcMultiConnection.openSignalingChannel = function (config) {
        var channel = config.channel || this.channel;
        defaultSocket.emit('new-channel', {
            channel: channel,
            sender: rtcMultiConnection.userid
        });

        var privateSocket = io.connect('/' + channel);
        privateSocket.channel = channel;
        privateSocket.on('connect', function () {
            if (config.callback) config.callback(privateSocket);
        });
        privateSocket.send = function (message) {
            privateSocket.emit('message', {
                sender: rtcMultiConnection.userid,
                data: message
            });
        };
        privateSocket.on('message', config.onmessage);
    };
};

var sessions = { };
rtcMultiConnection.onNewSession = function(session) {
    if (sessions[session.sessionid]) return;
    sessions[session.sessionid] = session;

    session.join();

    addNewMessage({
        header: session.extra.username,
        message: 'Making handshake with room owner....!',
        userinfo: '<img src="images/action-needed.png">',
		color: session.extra.color
    });
};

rtcMultiConnection.onRequest = function(request) {
    rtcMultiConnection.accept(request);
    addNewMessage({
        header: 'New Participant',
        message: 'A participant found. Accepting request of ' + request.extra.username + ' ( ' + request.userid + ' )...',
        userinfo: '<img src="images/action-needed.png">',
		color: request.extra.color
    });
};

rtcMultiConnection.onCustomMessage = function(message) {
    if (message.hasCamera || message.hasScreen) {
		var msg = message.extra.username + ' enabled webcam. <button id="preview">Preview</button> ---- <button id="share-your-cam">Share Your Webcam</button>';
		
		if(message.hasScreen) {
			msg = message.extra.username + ' is ready to share screen. <button id="preview">View His Screen</button> ---- <button id="share-your-cam">Share Your Screen</button>';
		}
		
        addNewMessage({
            header: message.extra.username,
            message: msg,
            userinfo: '<img src="images/action-needed.png">',
			color: message.extra.color,
            callback: function(div) {
                div.querySelector('#preview').onclick = function() {
                    this.disabled = true;
					
					message.session.oneway= true;
                    rtcMultiConnection.sendMessage({
                        renegotiate: true,
						streamid: message.streamid,
						session: message.session
                    });
                };

                div.querySelector('#share-your-cam').onclick = function() {
                    this.disabled = true;
					
					if(!message.hasScreen) {
						var session = {audio: true, video: true};
    
						rtcMultiConnection.captureUserMedia(function(stream) {
							rtcMultiConnection.peers[message.userid].peer.connection.addStream(stream);
							div.querySelector('#preview').onclick();
						}, session);
					}
					
					if(message.hasScreen) {
						var session = {screen: true};
    
						rtcMultiConnection.captureUserMedia(function(stream) {
							rtcMultiConnection.peers[message.userid].peer.connection.addStream(stream);
							div.querySelector('#preview').onclick();
						}, session);
					}
                };
            }
        });
    }

    if (message.hasMic) {
        addNewMessage({
            header: message.extra.username,
            message: message.extra.username + ' enabled microphone. <button id="listen">Listen</button> ---- <button id="share-your-mic">Share Your Mic</button>',
            userinfo: '<img src="images/action-needed.png">',
			color: message.extra.color,
            callback: function(div) {
                div.querySelector('#listen').onclick = function() {
                    this.disabled = true;
                    message.session.oneway= true;
                    rtcMultiConnection.sendMessage({
                        renegotiate: true,
						streamid: message.streamid,
						session: message.session
                    });
                };

                div.querySelector('#share-your-mic').onclick = function() {
                    this.disabled = true;
                    
					var session = {audio: true};
    
					rtcMultiConnection.captureUserMedia(function(stream) {
						rtcMultiConnection.peers[message.userid].peer.connection.addStream(stream);
						div.querySelector('#listen').onclick();
					}, session);
                };
            }
        });
    }

    if (message.renegotiate) {
		var customStream = rtcMultiConnection.customStreams[message.streamid];
		if(customStream) {
			rtcMultiConnection.peers[message.userid].renegotiate(customStream, message.session);
		}
    }
    
    if(message.messageFor == rtcMultiConnection.userid && message.areYouStillConnected) {
        rtcMultiConnection.sendCustomMessage({
            messageFor: message.from,
            from: rtcMultiConnection.userid,
            iAmStillConnected: true
        });
    }
    
    if(message.messageFor == rtcMultiConnection.userid && message.iAmStillConnected) {
        addNewMessage({
            header: (rtcMultiConnection.peers[message.from].extra.username || message.from) + ' is still connected!',
            message: 'WebRTC connection is still active between you and ' + (rtcMultiConnection.peers[message.from].extra.username || message.from) + '!',
            userinfo: getUserinfo(rtcMultiConnection.blobURLs[message.from], 'images/info.png')
        });
    }
};


rtcMultiConnection.blobURLs = { };
rtcMultiConnection.onstream = function(e) {
    if (e.stream.getVideoTracks().length) {
        rtcMultiConnection.blobURLs[e.userid] = e.blobURL;
        /*
        if( document.getElementById(e.userid) ) {
        document.getElementById(e.userid).muted = true;
        }
        */
        addNewMessage({
            header: e.extra.username,
            message: e.extra.username + ' enabled swebcam.',
            userinfo: '<video id="' + e.userid + '" src="' + URL.createObjectURL(e.stream) + '" autoplay muted=true volume=0></vide>',
			color: e.extra.color
        });
    } else {
        addNewMessage({
            header: e.extra.username,
            message: e.extra.username + ' enabled microphone.',
            userinfo: '<audio src="' + URL.createObjectURL(e.stream) + '" controls muted=true volume=0></vide>',
			color: e.extra.color
        });
    }
    usersContainer.appendChild(e.mediaElement);
};

rtcMultiConnection.sendMessage = function(message) {
    message.userid = rtcMultiConnection.userid;
    message.extra = rtcMultiConnection.extra;
    rtcMultiConnection.sendCustomMessage(message);
};

rtcMultiConnection.onclose = rtcMultiConnection.onleave = function(event) {
    addNewMessage({
        header: event.extra.username,
        message: event.extra.username + ' left the room.',
        userinfo: getUserinfo(rtcMultiConnection.blobURLs[event.userid], 'images/info.png'),
		color: e.extra.color
    });
};
