<p align="middle" ><img src="https://raw.githubusercontent.com/Mark910413/hc-react-cropper/master/example.jpg"/></p>
<h2 align="middle">Hc React Ruler</h2>

## Installation
### npm
```sh
$ npm i hc-react-cropper
```
## 🚀 How to use
```javascript
import React from 'react';
import { render} from 'react-dom';
import Cropper from '../../src';
import './style.css';

const config = {
  ratioXY: 1, // 裁剪 宽高比
  size: 2, // 限制大小 2m
}
class App extends React.Component {
  constructor(props) {
    super(props);
    this.onRef = this.onRef.bind(this);
    this.state = {
       src: ''
    }
  }
  onRef (ref) {
    this.child = ref;
  }
  getResult() {
    this.child.cropperImg()
    .then((res) => {
      if (!res) {return false;}
      this.setState({src: res.prefix + res.data});
    });
  }
  cancel() {
    this.child.cancel();
  }
  render() {
    return (
      <div style={{marginTop: '20px'}}>
        <Cropper
          onRef={this.onRef}
          {...config}
        >
          <div className="btn-wrapper">
            <button className="btn btn-cancel" onClick={() => this.cancel()}>取消</button>
            <button className="btn btn-cropper" onClick={() => this.getResult()}>裁剪</button>
          </div>
        </Cropper>
        <img src={this.state.src} width="200"></img>
      </div>
      
    ); 
  }
}
render(<App />, document.getElementById("root"));

```
	
	
## ⭐️ Show Your Support
Please give a ⭐️ if this project helped you!
