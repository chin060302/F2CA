import fs from 'fs';

function writefile(content){
    fs.appendFile('file.log', content, err => {
        if (err) {
            console.error(err);
    }
    console.log("writefile!")
  // done!
});
}