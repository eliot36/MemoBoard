
firebase.initializeApp(config);

// Google OAuth Init
const auth = firebase.auth();
const authProvider = new firebase.auth.GoogleAuthProvider();

// Firebase database init
const database = firebase.database();

// Root in DB
const data_root = 'memos/';

// Global Vars
var LoggedIn_User,
  CurrentMemo_Key,
  Active_Flag,
  Init_Save,
  Existed_Memo,
  NeedToSave_Flag;


const textInput = document.getElementById('memo-input'),
  newBtn = document.getElementById("newMemo-btn"),
  saveBtn = document.getElementById("save-btn"),
  deleteBtn = document.getElementById("delete-btn");


// Callback: whether success/fail Google OAuth
auth.onAuthStateChanged(function (user) {
  if (user) { //Sucess
    LoggedIn_User = user; //Restore user logged in
    getList_MemoFromDB(); //Bring memos from DB
  } else { //Fail
    auth.signInWithRedirect(authProvider); // Redirect Sign-in page
  }
});

// Callback function: Parse the data from DB when it has been added/updated
function getList_MemoFromDB() {
  let memoRef = database.ref(data_root + LoggedIn_User.uid);

  // When it has been added
  memoRef.on('child_added', parseData_fromChild);

  // When it has been updated
  memoRef.on('child_changed', updateData_fromChild);
}

// Get the key of memo when it saved without any selection
function getSaved_MemoKey(key) {
  CurrentMemo_Key = key;
  activeController_SelectedMemo(CurrentMemo_Key);
  Init_Save = undefined;
}

function title_Generator(text) {
  let title,
    breakPoint = text.indexOf('\n');

  if (breakPoint < 20 && breakPoint > -1) {
    title = text.substr(0, breakPoint);
  } else {
    title = text.substr(0, 20);
  }
  return title;
}

function breifMemo_Generator(text, titleLength) {
  let returnTxt,
    textLength = text.length,
    breakPoint = text.indexOf('\n', titleLength+1),
    firstSpace = text.indexOf(' ', titleLength+1);

  if (textLength > 60 && breakPoint > 60) {
    returnTxt = text.substr(firstSpace+1, 50+firstSpace);
  } else if (breakPoint < 60 && breakPoint > -1) {
    returnTxt = text.substr(firstSpace+1, breakPoint);
  } else {
    returnTxt = text.substr(firstSpace+1, textLength);
  }
  return returnTxt;
}

// Load/reload the data from DB
function parseData_fromChild(data) {
  const key = data.key,
    data_Val = data.val();
  let title = title_Generator(data_Val.text),
    text = breifMemo_Generator(data_Val.text, title.length);

  let template =
    `<li id=${key} class='collection-item avatar' onclick='fn_get_data_one(this.id);' >` +
    `<span class='title'> ${title} </span>` +
    `<p class='txt'> ${text} <br> </p>` +
    "</li>";

  document.getElementById('memo-index').innerHTML += template;

  // When the memo saved without selection
  if (Init_Save) {
    getSaved_MemoKey(key);
  }
}

// Update list of memo
function updateData_fromChild(data) {
  const data_Val = data.val();

  let title = title_Generator(data_Val.text),
    text = breifMemo_Generator(data_Val.text, title.length),
    template_selector = document.getElementById(data.key);

  template_selector.querySelector("span").innerHTML = title;
  template_selector.querySelector("p").innerHTML = text;
}

// When click list of memo, get data from DB
function fn_get_data_one(key_Data) {
  if (textInput.value !== "" && NeedToSave_Flag === true) {
    if (confirm("Oops, you may lose your new memo. You want to go for it?")) {
      NeedToSave_Flag = undefined; //We just loaded the memo from DB
      loadingData_fromDB(key_Data);
    }
  } else { //Just loading the data when textarea is empty
    loadingData_fromDB(key_Data);
  }
}

function loadingData_fromDB(key_Data) {
  CurrentMemo_Key = key_Data;
  let memoRef = database.ref(data_root + LoggedIn_User.uid + '/' + key_Data).once('value').then(function (snapshot) {
    textInput.value = snapshot.val().text;
    Existed_Memo = snapshot.val().text;
  });
  activeController_SelectedMemo(CurrentMemo_Key);
  addColor_blue(newBtn);
  addColor_blue(deleteBtn);
  addColor_red(saveBtn);
}

// Save/update data to DB
function saveData_toDB() { // If text is not empty
  if (textInput.value !== '') {
    // When the memo has been updated
    if (CurrentMemo_Key) {
      let memoRef = database.ref(data_root + LoggedIn_User.uid + '/' + CurrentMemo_Key);
      memoRef.update({
        text: textInput.value,
        updatedDate: getTimeandDate()
      });
      addColor_red(saveBtn);
      addColor_blue(newBtn);
      addColor_blue(deleteBtn);
      NeedToSave_Flag = undefined;


    } else { // When the memo has been created
      Init_Save = true;
      let memoRef = database.ref(data_root + LoggedIn_User.uid);
      memoRef.push({
        text: textInput.value,
        createdDate: getTimeandDate(),
        updatedDate: getTimeandDate()
      });
      addColor_red(saveBtn);
      addColor_blue(newBtn);
      addColor_blue(deleteBtn);
      NeedToSave_Flag = undefined;
    }
  } else {
    alert("You didn't enter any memo yet!")
  }
}

// Add/delte active class which selected memo
function removeClass_SelectedMemo() {
  let activeClass = document.getElementsByClassName('active');
  if (activeClass !== null) {
    activeClass[0].classList.remove('active');
  }
}

function addClass_SelectedMemo(memo_id) {
  document.getElementById(memo_id).classList.add('active');
}

function activeController_SelectedMemo(memo_id) {
  if (Active_Flag) {
    removeClass_SelectedMemo();
    addClass_SelectedMemo(memo_id);
  } else if (!Active_Flag) {
    addClass_SelectedMemo(memo_id);
    Active_Flag = true;
  }
}

// Get the current time
function getTimeandDate() {
  let today = new Date();
  var date = `${(today.getMonth() + 1)}/${today.getDate()}/${today.getFullYear() - 2000}`;
  var time = `${today.getHours()}:${today.getMinutes()}`;
  return date + ' ' + time;
}

// Clear input textarea
function clear_MemoInput() {
  textInput.value = '';
  Active_Flag = false;
  CurrentMemo_Key = null;
}

// Delete existed/new memo when click a delete button
function fn_delete_data() {
  let key_Data = CurrentMemo_Key;
  if (key_Data) {
    if (confirm('Do you want to delete this memo? It cannot be reversed.')) {
      let memoRef = database.ref(data_root + LoggedIn_User.uid + '/' + key_Data);
      memoRef.remove();
      document.getElementById(key_Data).remove();
      clear_MemoInput();
      NeedToSave_Flag = undefined;

      addColor_red(newBtn);
      addColor_red(saveBtn);
      addColor_red(deleteBtn);
    }
  } else {
    if (textInput.value !== "") {
      if (confirm('You need to save the memo, or you will lose your memo.')) {
        textInput.value = '';
        NeedToSave_Flag = undefined;
        addColor_red(newBtn);
        addColor_red(saveBtn);
        addColor_red(deleteBtn);
      }
    }
  }
}

// Create new memo when click a add button
function new_Memo() {
  if (textInput.value !== "") {
    if (NeedToSave_Flag === true) {
      if (confirm('You need to save the memo, or you will lose your memo.')) {
        clear_MemoInput();
        if (Active_Flag) {
          removeClass_SelectedMemo();
        }
      }
    } else if (NeedToSave_Flag === undefined) {
      clear_MemoInput();
      removeClass_SelectedMemo();
    }

    addColor_red(newBtn);
    addColor_red(saveBtn);
    addColor_red(deleteBtn);
    NeedToSave_Flag = undefined;
  }
}

// Changed the btn color to blue from red
function addColor_blue(target) {
  target.classList.remove("red");
  target.classList.add("blue");
}
// Changed the btn color to red from blue
function addColor_red(target) {
  target.classList.remove("blue");
  target.classList.add("red");
}

// Eventhandlers: input
$(function () {
  if (CurrentMemo_Key === undefined) {
    textInput.addEventListener('input', function () {
      if (textInput.value !== "") {
        addColor_blue(newBtn);
        addColor_blue(saveBtn);
        addColor_blue(deleteBtn);
        NeedToSave_Flag = true;
      } else {
        addColor_red(newBtn);
        addColor_red(saveBtn);
        addColor_red(deleteBtn);
        NeedToSave_Flag = undefined;
      }
    });
  } else {
    textInput.addEventListener('input', function () {
      if (textInput.value !== Existed_Memo) {
        addColor_blue(saveBtn);
        NeedToSave_Flag = true;
      } else {
        addColor_red(saveBtn);
        NeedToSave_Flag = undefined;
      }
    });
  }
});