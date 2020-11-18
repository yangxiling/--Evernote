const env = process.env.REACT_APP_ENV || process.env.NODE_ENV;

const host = env === 'development' ?
  'http://localhost:3100' :
  'https://my-json-server.typicode.com/qingguatang/fe-react-evernote';

  export default function (path, option){
    const url = host + path;
    return window.fetch(url, option).then(
      res => {
      res.json()
      console.log(res)
    })
}