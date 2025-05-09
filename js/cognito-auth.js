/*global WildRydes _config AmazonCognitoIdentity AWSCognito*/

var WildRydes = window.WildRydes || {};

(function scopeWrapper($) {
    var signinUrl = '/signin.html';

    var poolData = {
        UserPoolId: _config.cognito.userPoolId,
        ClientId: _config.cognito.userPoolClientId
    };

    var userPool;

    if (!(_config.cognito.userPoolId &&
          _config.cognito.userPoolClientId &&
          _config.cognito.region)) {
        $('#noCognitoMessage').show();
        return;
    }

    userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

    if (typeof AWSCognito !== 'undefined') {
        AWSCognito.config.region = _config.cognito.region;
    }

    WildRydes.signOut = function signOut() {
        userPool.getCurrentUser().signOut();
    };

    WildRydes.authToken = new Promise(function fetchCurrentAuthToken(resolve, reject) {
        var cognitoUser = userPool.getCurrentUser();

        if (cognitoUser) {
            cognitoUser.getSession(function sessionCallback(err, session) {
                if (err) {
                    reject(err);
                } else if (!session.isValid()) {
                    resolve(null);
                } else {
                    resolve(session.getIdToken().getJwtToken());
                }
            });
        } else {
            resolve(null);
        }
    });


    /*
     * Cognito User Pool functions
     */

    function register(email, password, fullName, preferredUsername, phoneNumber, birthdate, onSuccess, onFailure) {
        var attributeList = [];
        attributeList.push(new AmazonCognitoIdentity.CognitoUserAttribute({Name:  'name', Value: fullName}));
        attributeList.push(new AmazonCognitoIdentity.CognitoUserAttribute({Name:  'preferred_username',Value: preferredUsername}));
        attributeList.push(new AmazonCognitoIdentity.CognitoUserAttribute({Name:  'phone_number',Value: phoneNumber}));
        attributeList.push(new AmazonCognitoIdentity.CognitoUserAttribute({Name:  'birthdate', Value: birthdate}));
        attributeList.push(new AmazonCognitoIdentity.CognitoUserAttribute({Name:  'email', Value: email}));

        userPool.signUp(
            toUsername(email),
            password,
            attributeList,
            null,
            function signUpCallback(err, result) {
                if (!err) {
                    onSuccess(result);
                } else {
                    onFailure(err);
                }
            }
        );
    }

    function signin(email, password, onSuccess, onFailure) {
        var authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails({
            Username: toUsername(email),
            Password: password
        });

        var cognitoUser = createCognitoUser(email);
        cognitoUser.authenticateUser(authenticationDetails, {
            onSuccess: onSuccess,
            onFailure: onFailure
        });
    }

    function verify(email, code, onSuccess, onFailure) {
        createCognitoUser(email).confirmRegistration(code, true, function confirmCallback(err, result) {
            if (!err) {
                onSuccess(result);
            } else {
                onFailure(err);
            }
        });
    }

    function createCognitoUser(email) {
        return new AmazonCognitoIdentity.CognitoUser({
            Username: toUsername(email),
            Pool: userPool
        });
    }

    function toUsername(email) {
        return email.replace('@', '-at-');
    }

    /*
     *  Event Handlers
     */

    $(function onDocReady() {
        $('#signinForm').submit(handleSignin);
        $('#registrationForm').submit(handleRegister);
        $('#verifyForm').submit(handleVerify);
    });

    function handleSignin(event) {
        var email = $('#emailInputSignin').val();
        var password = $('#passwordInputSignin').val();
        event.preventDefault();
        signin(email, password,
            function signinSuccess() {
                console.log('Successfully Logged In');
                window.location.href = 'index.html';//'ride.html';
            },
            function signinError(err) {
                alert(err);
            }
        );
    }

    function handleRegister(event) {
        var email = $('#emailInputRegister').val();
        var password = $('#passwordInputRegister').val();
        var password2 = $('#password2InputRegister').val();
        var fullName          = $('#nameInputRegister').val();
        var preferredUsername = $('#preferredUsernameInputRegister').val();
        var phoneNumber       = $('#phoneNumberInputRegister').val();
        var birthdate         = $('#birthdateInputRegister').val();

        var onSuccess = function registerSuccess(result) {
            var cognitoUser = result.user;
            console.log('user name is ' + cognitoUser.getUsername());
            var confirmation = ('Registration successful. Please check your email inbox or spam folder for your verification code.');
            if (confirmation) {
                window.location.href = 'verify.html';
            }
        };
        var onFailure = function registerFailure(err) {
            alert(err);
        };
        event.preventDefault();

        if (password === password2) {
            register(email, password, fullName, preferredUsername, phoneNumber, birthdate, onSuccess, onFailure);
        } else {
            alert('Passwords do not match');
        }
    }

    function handleVerify(event) {
        var email = $('#emailInputVerify').val();
        var code = $('#codeInputVerify').val();
        event.preventDefault();
        verify(email, code,
            function verifySuccess(result) {
                console.log('call result: ' + result);
                console.log('Successfully verified');
                alert('Verification successful. You will now be redirected to the login page.');
                window.location.href = signinUrl;
            },
            function verifyError(err) {
                alert(err);
            }
        );
    }

    function showLoggedIn(user) {
      $('#loginMessage').text(`Howdy, ${user.getUsername()}! You’re all set.`);
      $('#authLinks').hide();
      $('#authStatus').show();
    }
    
    function showLoggedOut() {
      $('#authStatus').hide();
      $('#authLinks').show();
    }
    
    $(function() {
      var cognitoUser = userPool.getCurrentUser();
      if (!cognitoUser) {
        return showLoggedOut();
      }
      cognitoUser.getSession(function(err, session) {
        if (err || !session.isValid()) {
          return showLoggedOut();
        }
        showLoggedIn(cognitoUser);
      });
    });
    
    $('#logoutButton').on('click', function() {
      var cognitoUser = userPool.getCurrentUser();
      if (cognitoUser) cognitoUser.signOut();
      showLoggedOut();
    });

}(jQuery));
