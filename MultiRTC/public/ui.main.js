// https://www.webrtc-experiment.com:12034/

function getElement(selector) {
    return document.querySelector(selector);
}

var main = getElement('.main');

function getRandomColor() {
    var letters = '0123456789ABCDEF'.split('');
    var color = '#';
    for (var i = 0; i < 6; i++ ) {
        color += letters[Math.round(Math.random() * 15)];
    }
    return color;
}

function addNewMessage(args) {
    var newMessageDIV = document.createElement('div');
    newMessageDIV.className = 'new-message';

    var userinfoDIV = document.createElement('div');
    userinfoDIV.className = 'user-info';
    userinfoDIV.innerHTML = args.userinfo || '<img src="images/user.png">';
	
	userinfoDIV.style.background = args.color || rtcMultiConnection.extra.color || getRandomColor();

    newMessageDIV.appendChild(userinfoDIV);

    var userActivityDIV = document.createElement('div');
    userActivityDIV.className = 'user-activity';

    userActivityDIV.innerHTML = '<h2 class="header">' + args.header + '</h2>';

    var p = document.createElement('p');
    p.className = 'message';
    userActivityDIV.appendChild(p);
    p.innerHTML = args.message;

    newMessageDIV.appendChild(userActivityDIV);

    main.insertBefore(newMessageDIV, main.firstChild);

    userinfoDIV.style.height = newMessageDIV.clientHeight + 'px';

    if (args.callback) {
        args.callback(newMessageDIV);
    }

    document.querySelector('#message-sound').play();
}

var socket;

main.querySelector('input').onkeyup = function(e) {
    if (e.keyCode != 13) return;
    main.querySelector('button').onclick();
};

main.querySelector('button').onclick = function() {
    var input = this.parentNode.querySelector('input');
    input.disabled = this.disabled = true;

    var username = input.value || 'Anonymous';

	rtcMultiConnection.extra = {
        username: username,
		color: getRandomColor()
    };

    var signaling_url = '/?userid=' + rtcMultiConnection.userid + '&room=' + location.href.split('/').pop();
    socket = io.connect(signaling_url);

    addNewMessage({
        header: username,
        message: 'Searching for existing rooms...',
        userinfo: '<img src="images/action-needed.png">'
    });

    socket.on('room-found', function(roomFound) {
        rtcMultiConnection.getStats(function(stat) {
            if(stat.numberOfConnectedUsers == 2) return;
            
            if (roomFound) {
                addNewMessage({
                    header: username,
                    message: 'Room found. Joining the room...',
                    userinfo: '<img src="images/action-needed.png">'
                });

                rtcMultiConnection.init();
                rtcMultiConnection.connect();
            } else {
                addNewMessage({
                    header: username,
                    message: 'No room found. Creating new room...<br /><br />You can share following link with your friends:<br /><a href="' + location.href + '">' + location.href + '</a>',
                    userinfo: '<img src="images/action-needed.png">'
                });
                rtcMultiConnection.init();
                rtcMultiConnection.open();
            }
        });
    });

    socket.on('user-left', function(e) {
        if (e.room != location.href.split('/').pop()) return;

        addNewMessage({
            header: (rtcMultiConnection.peers[e.userid].extra.username || e.userid) + ' seems disconnected',
            message: (rtcMultiConnection.peers[e.userid].extra.username || e.userid) + ' seems disconnected from socket.io server.<ol style="margin:2em;"><li>Maybe socket.io connection is dropped on his side. It is not a big deal!</li><li>Maybe he really left you! Then WebRTC connection will also drop.</li></ol>Checking WebRTC connection status...',
            userinfo: getUserinfo(rtcMultiConnection.blobURLs[e.userid], 'images/info.png')
        });
        
        rtcMultiConnection.peers[e.userid].oniceconnectionstatechange = function() {
            if(rtcMultiConnection.peers[e.userid].peer.connection.iceConnectionState == 'disconnected') {
                addNewMessage({
                    header: 'WebRTC Connection is Dropped!',
                    message: 'WebRTC connection is dropped between you and ' + (rtcMultiConnection.peers[e.userid].extra.username || e.userid) + '!',
                    userinfo: getUserinfo(rtcMultiConnection.blobURLs[e.userid], 'images/info.png')
                });
                onUserLeft(e.userid);
            }
        };
        
        rtcMultiConnection.sendCustomMessage({
            messageFor: e.userid,
            from: rtcMultiConnection.userid,
            areYouStillConnected: true
        });
    });
    
    socket.on('playRoleOfInitiator', function(who) {
        if(who == rtcMultiConnection.userid) {
            rtcMultiConnection.playRoleOfInitiator();
            socket.emit('playRoleOfInitiator', rtcMultiConnection.userid);
        }
    });
};

function onUserLeft(userid) {
    for (var stream in rtcMultiConnection.streams) {
        stream = rtcMultiConnection.streams[stream];
        if (stream.userid == userid) {
            stream.stop();
            rtcMultiConnection.onstreamended(stream.streamObject);
            delete rtcMultiConnection.streams[stream];
        }
    }

    numbersOfUsers.innerHTML = parseInt(numbersOfUsers.innerHTML) - 1;

    addNewMessage({
        header: 'User Left',
        message: (rtcMultiConnection.peers[userid].extra.username || userid) + ' left the room.',
        userinfo: getUserinfo(rtcMultiConnection.blobURLs[userid], 'images/info.png')
    });
}

function getUserinfo(blobURL, imageURL) {
    return blobURL ? '<video src="' + blobURL + '" autoplay></vide>' : '<img src="' + imageURL + '">';
}

var isShiftKeyPressed = false;

getElement('.main-input-box textarea').onkeydown = function(e) {
	if(e.keyCode == 16) {
		isShiftKeyPressed = true;
	}
};

var numberOfKeys = 0;
getElement('.main-input-box textarea').onkeyup = function(e) {
    numberOfKeys++;
    if(numberOfKeys > 3) numberOfKeys = 0;
    
    if(!numberOfKeys) {
        if(e.keyCode == 8) {
            return rtcMultiConnection.send({
                stoppedTyping: true
            });
        }
    
        rtcMultiConnection.send({
            typing: true
        });
    }
	
	if(isShiftKeyPressed) {
		if(e.keyCode == 16) {
			isShiftKeyPressed = false;
		}
		return;
	}
	
	
    if (e.keyCode != 13) return;

    addNewMessage({
        header: rtcMultiConnection.extra.username,
        message: 'Your Message:<br /><br />' + linkify(this.value),
        userinfo: getUserinfo(rtcMultiConnection.blobURLs[rtcMultiConnection.userid], 'images/chat-message.png'),
		color: rtcMultiConnection.extra.color
    });

    rtcMultiConnection.send(this.value);

    this.value = '';
};

getElement('#allow-webcam').onclick = function() {
    this.disabled = true;
    
	var session = {audio: true, video: true};
    
    rtcMultiConnection.captureUserMedia(function(stream) {
		var streamid = rtcMultiConnection.token();
		rtcMultiConnection.customStreams[streamid] = stream;
		
		rtcMultiConnection.sendMessage({
			hasCamera: true,
			streamid : streamid,
			session: session
		});
    }, session);
};

getElement('#allow-mic').onclick = function() {
    this.disabled = true;
    var session = {audio: true};
    
    rtcMultiConnection.captureUserMedia(function(stream) {
		var streamid = rtcMultiConnection.token();
		rtcMultiConnection.customStreams[streamid] = stream;
		
		rtcMultiConnection.sendMessage({
			hasMic: true,
			streamid : streamid,
			session: session
		});
    }, session);
};

getElement('#allow-screen').onclick = function() {
    this.disabled = true;
    var session = {screen: true};
    
    rtcMultiConnection.captureUserMedia(function(stream) {
		var streamid = rtcMultiConnection.token();
		rtcMultiConnection.customStreams[streamid] = stream;
		
		rtcMultiConnection.sendMessage({
			hasScreen: true,
			streamid : streamid,
			session: session
		});
    }, session);
};

getElement('#share-files').onclick = function() {
    var file = document.createElement('input');
    file.type = 'file';

    file.onchange = function() {
        rtcMultiConnection.send(this.files[0]);
    };
    fireClickEvent(file);
};

function fireClickEvent(element) {
    var evt = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true
    });

    element.dispatchEvent(evt);
}

getElement('#self-url').innerHTML = getElement('#self-url').href = location.href;

function bytesToSize(bytes) {
    var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes == 0) return '0 Bytes';
    var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
}
