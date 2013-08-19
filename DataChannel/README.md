##### [DataChannel.js](https://www.webrtc-experiment.com/DataChannel.js) : A JavaScript wrapper library for RTCDataChannel APIs / [Demos](https://www.webrtc-experiment.com/#DataChannel)

DataChannel.js is a JavaScript library useful to write many-to-many i.e. group file/data sharing or text chat applications. Its syntax is easier to use and understand. It highly simplifies complex tasks like any or all user rejection/ejection; direct messages delivery; and more.

=

##### Features

1. Direct messages � to any user using his `user-id`
2. Eject/Reject any user � using his `user-id`
3. Leave any room (i.e. data session) or close entire session using `leave` method
4. File size is limitless!
5. Text message length is limitless!
6. Size of data is also limitless!
7. Fallback to firebase/socket.io/websockets/etc.
8. Users' presence detection using `onleave`
9. Latency detection
10. Multi-longest strings/files concurrent 

=

##### Try a Quick Demo (Text Chat)

```html
<script src="https://www.webrtc-experiment.com/DataChannel.js"> </script>

<input type="text" id="chat-input" disabled style="font-size: 2em; width: 98%;"><br />
<div id="chat-output"></div>

<script>
    var chatOutput = document.getElementById('chat-output');
    var chatInput = document.getElementById('chat-input');
    chatInput.onkeypress = function(e) {
        if (e.keyCode != 13) return;
        channel.send(this.value);
        chatOutput.innerHTML = 'Me: ' + this.value + '<hr />' + chatOutput.innerHTML;
        this.value = '';
    };
</script>

<script>
    var channel = new DataChannel('Session Unique Identifier');

    channel.onopen = function(userid) {
        chatInput.disabled = false;
        chatInput.value = 'Hi, ' + userid;
        chatInput.focus();
    };

    channel.onmessage = function(message, userid) {
        chatOutput.innerHTML = userid + ': ' + message + '<hr />' + chatOutput.innerHTML;
    };

    channel.onleave = function(userid) {
        chatOutput.innerHTML = userid + ' Left.<hr />' + chatOutput.innerHTML;
    };
</script>
```

=

##### First Step: Link the library

```html
<script src="https://www.webrtc-experiment.com/DataChannel.js"></script>
```

=

##### Last Step: Start using it!

```javascript
var channel = new DataChannel('channel-name');
channel.send(file || data || 'text-message');
```

=

##### `onopen` and `onmessage`

If you're familiar with WebSockets; these two methods works in the exact same way:

```javascript
channel.onopen = function(userid) { }
channel.onmessage = function(message, userid, latency) { }
```

`user-ids` can be used to send **direct messages** or to **eject/leave** any user:

=

##### `ondatachannel`

Allows you show list of all available data channels to the user; and let him choose which one to join:

```javascript
channel.ondatachannel = function(data_channel) {
    channel.join(data_channel);
	
    // or
    channel.join({
        id:    data_channel.id,
        owner: data_channel.owner
    });
	
    // id:    unique identifier for the session
    // owner: unique identifier for the session initiator
};
```

=

##### Use custom user-ids

```javascript
channel.userid = 'predefined-userid';

// or for auto-initiated data connections
new DataChannel('channel-name', {
    userid: 'predefined-userid'
});
```

Remeber; custom defined `user-id` must be unique username.

=

##### Direct messages

```javascript
channel.channels[userid].send(file || data || 'text message');
```

=

##### Eject/Reject users using their `user-ids`

```javascript
channel.eject(userid);  // throw a user out of your room!
```

=

##### Close/Leave the entire room

```javascript
channel.leave();        // close your own entire data session
```

=

##### Detect users' presence

```javascript
channel.onleave = function(userid) { };
```

=

##### Auto Close Entire Session

When room initiator leaves; you can enforce auto-closing of the entire session. By default: it is `false`:

```javascript
channel.autoCloseEntireSession = true;

// or 
new DataChannel('channel-name', {
    autoCloseEntireSession: true
});
```

It means that session will be kept active all the time; even if initiator leaves the session.

You can set `autoCloseEntireSession` before calling `leave` method; which will enforce closing of the entire session:

```javascript
channel.autoCloseEntireSession = true;
channel.leave(); // closing entire session
```

=

##### `uuid` for files

You can get `uuid` for each file (being sent) like this:

```javascript
channel.send(file);
var uuid = file.uuid; // "file"-Dot-uuid
```

=

##### To Share files

```javascript
// show progress bar!
channel.onFileProgress = function (packets, uuid) {
    // packets.remaining
    // packets.sent      (for sender)
    // packets.received  (for receiver)
    // packets.length
    // uuid:	file unique identifier
};

// on file successfully sent
channel.onFileSent = function (file, uuid) {
    // file.name
    // file.size
};

// on file successfully received
channel.onFileReceived = function (fileName, file) {};
```

=

##### Auto-Save file to Disk

By default; `autoSaveToDisk` is set to `true`. When it is `true`; it will save file to disk as soon as it is received. To prevent auto-saving feature; just set it `false`:

```javascript
channel.autoSaveToDisk = false; // prevent auto-saving!
channel.onFileReceived = function (fileName, file) {
    // file.blob
    // file.dataURL
    // file.url
    // file.uuid
	
    hyperlink.href = file.url;
};
```

=

##### Latency Detection

```javascript
channel.onmessage = function(message, userid, latency) {
    console.log('latency:', latency, 'milliseconds');
};
```

=

##### Concurrent Transmission

You can send multiple files concurrently; or multiple longer text messages:

```javascript
channel.send(fileNumber1);
channel.send(fileNumber2);
channel.send(fileNumber3);

channel.send('longer string-1');
channel.send('longer string-2');
channel.send('longer string-3');
```

=

##### Errors Handling

```javascript
// error to open data ports
channel.onerror = function(event) {}

// data ports suddenly dropped
channel.onclose = function(event) {}
```

=

##### Data session direction

Default direction is `many-to-many`.

```javascript
channel.direction = 'one-to-one';
channel.direction = 'one-to-many';
channel.direction = 'many-to-many';
```

=

##### Use [your own socket.io for signaling](https://github.com/muaz-khan/WebRTC-Experiment/blob/master/socketio-over-nodejs)

```javascript
var channel = new DataChannel('default-channel');
channel.openSignalingChannel = function(config) {
   var URL = '/';
   var channel = config.channel || this.channel || 'default-channel';
   var sender = Math.round(Math.random() * 60535) + 5000;
   
   io.connect(URL).emit('new-channel', {
      channel: channel,
      sender : sender
   });
   
   var socket = io.connect(URL + channel);
   socket.channel = channel;
   
   socket.on('connect', function () {
      if (config.callback) config.callback(socket);
   });
   
   socket.send = function (message) {
        socket.emit('message', {
            sender: sender,
            data  : message
        });
    };
   
   socket.on('message', config.onmessage);
};
```

=

##### `transmitRoomOnce`

`transmitRoomOnce` is preferred when using Firebase for signaling. It saves bandwidth and asks DataChannel.js library to not repeatedly transmit room details.

```javascript
var channel = new DataChannel('channel-name', {
    transmitRoomOnce: true
});
```

If you want to use Firebase for signaling; you must use it like this:

```javascript
var channel = new DataChannel('default-channel', {
    openSignalingChannel: function (config) {
        config = config || {};
        channel = config.channel || self.channel || 'default-channel';
        var socket = new window.Firebase('https://chat.firebaseIO.com/' + channel);
        socket.channel = channel;
        socket.on('child_added', function (data) {
            var value = data.val();
            if (value == 'joking') config.onopen && config.onopen();
            else config.onmessage(value);
        });
        socket.send = function (data) {
            this.push(data);
        };
        socket.push('joking');
        self.socket = socket;
        return socket;
    }
});
```

=

##### For auto-created data sessions

You can pass `direction` or other parts like this:

```javascript
var channel = new DataChannel('channel-name', {
    transmitRoomOnce: true,
    direction: 'one-to-many',
});
```

=

##### Manually open/connect data sessions

```javascript
// to create/open a new channel
channel.open('channel-name');

// if soemone already created a channel; to join it: use "connect" method
channel.connect('channel-name');
```

=

##### [Demos using DataChannel.js](https://www.webrtc-experiment.com/#DataChannel)

1. [DataChannel basic demo](https://www.webrtc-experiment.com/DataChannel/)
2. [Auto Session Establishment and Users presence detection](https://www.webrtc-experiment.com/DataChannel/auto-session-establishment.html)

=

##### Browser Support

[DataChannel.js](https://github.com/muaz-khan/WebRTC-Experiment/tree/master/DataChannel) works fine on following browsers:

| Browser        | Support           |
| ------------- |:-------------|
| Firefox | [Stable](http://www.mozilla.org/en-US/firefox/new/) / [Aurora](http://www.mozilla.org/en-US/firefox/aurora/) / [Nightly](http://nightly.mozilla.org/) |
| Google Chrome | [Stable](https://www.google.com/intl/en_uk/chrome/browser/) / [Canary](https://www.google.com/intl/en/chrome/browser/canary.html) / [Beta](https://www.google.com/intl/en/chrome/browser/beta.html) / [Dev](https://www.google.com/intl/en/chrome/browser/index.html?extra=devchannel#eula) |
| Android | [Chrome Beta](https://play.google.com/store/apps/details?id=com.chrome.beta&hl=en) |

=

##### License

[DataChannel.js](https://github.com/muaz-khan/WebRTC-Experiment/tree/master/DataChannel) is released under [MIT licence](https://www.webrtc-experiment.com/licence/) . Copyright (c) 2013 [Muaz Khan](https://plus.google.com/100325991024054712503).
