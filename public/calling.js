document.addEventListener('DOMContentLoaded', () => {
    const audioCallButton = document.querySelector('#audioCallButton');
    const videoCallButton = document.querySelector('#videoCallButton');
    const localVideo = document.querySelector('#localVideo');
    const remoteVideo = document.querySelector('#remoteVideo');
    const callRequestModal = document.querySelector('#callRequestModal');
    const callRequestMessage = document.querySelector('#callRequestMessage');
    const acceptCallButton = document.querySelector('#acceptCallButton');
    const rejectCallButton = document.querySelector('#rejectCallButton');
    const disconnectButton = document.querySelector('#disconnectButton');

    if (audioCallButton && videoCallButton && disconnectButton) {
        audioCallButton.addEventListener('click', () => {
            sendCallRequest('audio');
        });

        videoCallButton.addEventListener('click', () => {
            sendCallRequest('video');
        });

        disconnectButton.addEventListener('click', () => {
            console.log('Disconnect button clicked'); // Debug log
            disconnectCall();
        });
    } else {
        console.error('One or more buttons not found.');
    }

    let localStream;
    let remoteStream;
    let peerConnection;

    const servers = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    };

    function sendCallRequest(callType) {
        socket.emit('callRequest', {
            from: name,
            to: selectedContact,
            callType: callType
        });
    }

    function startCall(callType) {
        navigator.mediaDevices.getUserMedia({
            video: callType === 'video',
            audio: true
        }).then(stream => {
            console.log("Local stream obtained");
            localStream = stream;
            localVideo.srcObject = stream;

            peerConnection = new RTCPeerConnection(servers);
            stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

            peerConnection.ontrack = event => {
                console.log("Remote stream received");
                if (!remoteVideo.srcObject) {
                    remoteVideo.srcObject = event.streams[0];
                }
            };

            peerConnection.onicecandidate = event => {
                if (event.candidate) {
                    socket.emit('candidate', {
                        candidate: event.candidate,
                        to: selectedContact
                    });
                }
            };

            // Create and send offer
            peerConnection.createOffer().then(offer => {
                return peerConnection.setLocalDescription(offer);
            }).then(() => {
                socket.emit('offer', {
                    offer: peerConnection.localDescription,
                    to: selectedContact,
                    from: name
                });
            });

        }).catch(error => {
            console.error('Error accessing media devices.', error);
        });
    }

    function handleOffer(message) {
        peerConnection = new RTCPeerConnection(servers);

        peerConnection.ontrack = event => {
            console.log("Remote stream received on offer");
            remoteStream = event.streams[0];
            remoteVideo.srcObject = remoteStream;
        };

        peerConnection.onicecandidate = event => {
            if (event.candidate) {
                socket.emit('candidate', {
                    candidate: event.candidate,
                    to: message.from
                });
            }
        };

        peerConnection.setRemoteDescription(new RTCSessionDescription(message.offer)).then(() => {
            return navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });
        }).then(stream => {
            console.log("Local stream obtained on offer");
            localStream = stream;
            localVideo.srcObject = stream;
            stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

            return peerConnection.createAnswer();
        }).then(answer => {
            return peerConnection.setLocalDescription(answer);
        }).then(() => {
            socket.emit('answer', {
                answer: peerConnection.localDescription,
                to: message.from
            });
        }).catch(error => {
            console.error('Error during offer handling', error);
        });
    }

    function handleAnswer(message) {
        if (peerConnection.signalingState === 'have-local-offer') {
            peerConnection.setRemoteDescription(new RTCSessionDescription(message.answer)).catch(error => {
                console.error('Error setting remote description from answer', error);
            });
        }
    }

    function handleCandidate(message) {
        if (message.candidate) {
            peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate)).catch(error => {
                console.error('Error adding received ICE candidate', error);
            });
        }
    }

    function disconnectCall() {
        console.log('Disconnecting call'); // Debug log

        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            console.log('Local stream stopped');
        }

        if (remoteStream) {
            remoteStream.getTracks().forEach(track => track.stop());
            console.log('Remote stream stopped');
        }

        if (peerConnection) {
            peerConnection.close();
            peerConnection = null;
            console.log('Peer connection closed');
        }

        localVideo.srcObject = null;
        remoteVideo.srcObject = null;

        socket.emit('callEnded', {
            to: selectedContact,
            from: name
        });

        console.log('Call ended');
    }

    socket.on('callRequest', (data) => {
        if (data.to === name) {
            callRequestMessage.textContent = `${data.from} is calling you for a ${data.callType} call.`;
            callRequestModal.style.display = 'block';

            acceptCallButton.onclick = () => {
                socket.emit('callAccepted', { to: data.from, callType: data.callType });
                callRequestModal.style.display = 'none';
                startCall(data.callType);
            };

            rejectCallButton.onclick = () => {
                socket.emit('callRejected', { to: data.from });
                callRequestModal.style.display = 'none';
            };
        }
    });

    socket.on('callAccepted', (data) => {
        if (data.to === name) {
            startCall(data.callType);
        }
    });

    socket.on('offer', (data) => {
        if (data.to === name) {
            handleOffer(data);
        }
    });

    socket.on('answer', (data) => {
        if (data.to === name) {
            handleAnswer(data);
        }
    });

    socket.on('candidate', (data) => {
        if (data.to === name) {
            handleCandidate(data);
        }
    });

    socket.on('callEnded', (data) => {
        if (data.to === name) {
            disconnectCall();
        }
    });
});