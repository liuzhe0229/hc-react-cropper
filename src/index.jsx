import React from 'react';
import Cropper from './cropper/Cropper';
import Compress from './compress/Compress';

import './style.css';

class CropperComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      cropping: false,
      ...props,
    };
    this.canvas = React.createRef();
    this.ruler = null;
    
    this.handleFileSelect = this.handleFileSelect.bind(this);

    this.cropperImg  = this.cropperImg.bind(this);
  }
  componentDidMount() {
    this.props.onRef(this);
    this.cropper = new Cropper({
      ele: this.canvas,
      ratioXY: this.state.ratioXY,
    });
    this.compress = new Compress();
  }
  handleFileSelect(e) {
    this.cropper.init(e.target.files[0]);
    this.setState({cropping: true});
  }
  async cropperImg() {
    if (!this.state.cropping) {return false;}
    const url = this.cropper.getCroppedImageSrc();
    if (!url) {return false;}

    const cropperfile = this.cropper.dataURLtoFile(url);
    
    const results = await this.compress.compress([cropperfile], {size: this.state.size, quality: 0.75});

    const output = results[0];
    const compressFile = Compress.convertBase64ToFile(output.data, this.props.fileName, output.ext);

    results[0].cropperFile = cropperfile;
    results[0].compressFile = compressFile;
    return results[0];
  }
  cancel() {
    this.setState({cropping: false});
  }
  render() {
    const { props } = this;
    const { cropping } = this.state;
    return (
      <div className="hc-cropper-component">
        <div ref={(e) => this.canvas = e } className="canvas-warpper" style={{display: cropping ? 'block' : 'none'}}></div>
        {
          !cropping ?
            <label className="select-file-label">
              <input type="file" id="fileInput" onChange={this.handleFileSelect} accept="image/gif,image/jpeg,image/jpg,image/png,image/svg"/>
            </label> 
          :
             null
        }
        
        {props.children}
      </div>
    )
  }
}

export default CropperComponent;
