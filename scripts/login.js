var name = 'undefined';

var authKey = localStorage.getItem("oAuth");
if (!authKey || (authKey == '')) {
  
} else {
  var data = {
    type: "auth",
    auth: authKey
  }
  console.log(data)
  try {
    const response = await fetch("./auth", {
      method: "POST", // or 'PUT'
      headers: {
      "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await response.text();
    if (result == "0") {
      
    } else {
      name = result;
      console.log('signed in');
      console.log(name);
      if (confirm("Signed in as "+ name +"!\nStay signed in(Cancel) or log out(Ok)") == true) {
        localStorage.setItem("oAuth", '');
        location.reload();
      } else {
        window.location.href = './';
      }
    }
  } catch (error) {
    
  }
}

document.getElementById('submit').onclick = async function (e) {
    var email = document.getElementById('email').value;
    var password = document.getElementById('password').value;

    if (!email) {
        window.alert('missing email')
    }
    if (!password) {
        window.alert('missing password')
    }

    if (!document.getElementById('email').validity.valid) {
        document.getElementById('email').reportValidity();
        return;
    }

    var data = {
        type: "login",
        email: email,
        password: password
    }
    console.log(data)
    try {
        const response = await fetch("./auth", {
            method: "POST", // or 'PUT'
            headers: {
            "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });

        const result = await response.text();
        if (result == "-1") {
            window.alert('invalid input')
        } else if (result == "0") {
            window.alert('email not found')
        } else if (result == "1") {
            window.alert('incorrect password')
        } else {
            window.alert('sucess!')
            localStorage.setItem("oAuth", result);
            window.location.href = './';
        }
    } catch (error) {
        window.alert("Signin error");
    }
}