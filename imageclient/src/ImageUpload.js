import React from 'react';
import axios from 'axios';
import Container from 'react-bootstrap/Container';
import Alert from 'react-bootstrap/Alert';
import Table from 'react-bootstrap/Table';
import Image from 'react-bootstrap/Image';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Spinner from 'react-bootstrap/Spinner';


//Get API URL from Process
export const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000/";
export const API_KEY = process.env.REACT_APP_API_KEY || "IMAGEAPIKEY20210206SERVERLESS";

//export const API_URL = process.env.REACT_APP_API_URL || "https://emif67ed49.execute-api.us-east-2.amazonaws.com/Prod/";

export default class ImageUpload extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            selectedFile: null,
            loading: false,
            image: null,
            imagescaled: null,
            scaleType: "BICUBIC",
            width: 25,
            height: 25,
            iserror: false,
            error: '',
        };
        this.handleFileChange = this.handleFileChange.bind(this);
        this.handleScaleTypeChange = this.handleScaleTypeChange.bind(this);
        this.handleWidthChange = this.handleWidthChange.bind(this);
        this.handleHeightChange = this.handleHeightChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);


        this.downloadFile = this.downloadFile.bind(this);
    }

    handleFileChange = event => {
        let imagefile = event.target.files[0];
        this.setState({
            image: imagefile,
            selectedFile: URL.createObjectURL(imagefile),
        });
    };

    handleScaleTypeChange = event => {
        this.setState({
            scaleType: event.target.value
        });
    };

    handleHeightChange = event => {
        this.setState({
            height: parseInt(event.target.value)
        });
    };

    handleWidthChange = event => {
        this.setState({
            width: parseInt(event.target.value)
        });
    };

    downloadFile = () => {
        let a = document.createElement('a');
        a.href = this.state.imagescaled;
        a.download = 'image.png';
        a.click();
    };


    handleSubmit = event => {
        this.setState({
            loading: true,
            iserror: false,
            error: '',
        });
        this.readBase64File().then((data) => {
            this.submitImage(data).then((image) => {
                this.setState({
                    imagescaled: "data:image/png;base64," + image.resized,
                    loading: false
                });
            });
        });
    };

    readBase64File = async () => {
        return new Promise((resolve, reject) => {
            var reader = new FileReader();
            reader.readAsDataURL(this.state.image);
            reader.onload = function () {
                resolve(reader.result.substring((reader.result.indexOf("base64,") + 7)));
            }
        });
    };

    submitImage = async (imagedata) => {
        const response = await axios.post(API_URL + "images/", {
            "image": imagedata,
            "scaletype": this.state.scaleType,
            "width": this.state.width,
            "height": this.state.height
        }, {
            headers: {
                "Content-Type": "application/json",
                "accept": "application/json,application/octet-stream,image/png",
                "x-api-key": API_KEY
            }
        });
        if (response.data) {
            return response.data;
        }
        return null;
    }

    render() {
        return (
            <Container>
                &nbsp;
                <Alert show={this.state.iserror} variant="danger"><p>{this.state.error}</p></Alert>
                <Table bordered striped variant="dark" size="sm">
                    <thead>
                        <tr>
                            <th class="text-center" style={{ width: "50%" }}>Original Image</th>
                            <th class="text-center" style={{ width: "50%" }}>Sampled Image</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style={{ width: "50%" }}>
                                <Table responsive striped variant="dark" size="sm">
                                    <tbody>
                                        <tr>
                                            <td colSpan="4">
                                                <Form.Control type="file" size="sm" onChange={this.handleFileChange} />
                                            </td>
                                        </tr>
                                        {this.state.selectedFile &&
                                            <tr>
                                                <td style={{ width: "50%" }} colSpan="4">
                                                    <Form.Label>Scaling:</Form.Label>
                                                    <Form.Control as="select" size="sm" id="imageScalingType" name="imageScalingType" value={this.state.scaleType} onChange={this.handleScaleTypeChange}>
                                                        <option>BICUBIC</option>
                                                        <option>NEAREST_NEIGHBOR</option>
                                                    </Form.Control>
                                                </td>
                                            </tr>
                                        }
                                        {this.state.selectedFile &&
                                            <tr>
                                                <td style={{ width: "50%" }} colSpan="2">
                                                    <Form.Label>Height:</Form.Label>
                                                    <Form.Control input="text" type="number" size="sm" id="imageScalingHeight" name="imageScalingHeight" value={this.state.height} onChange={this.handleHeightChange} >
                                                    </Form.Control>
                                                </td>
                                                <td style={{ width: "50%" }} colSpan="2">
                                                    <Form.Label>Width:</Form.Label>
                                                    <Form.Control input="text" type="number" size="sm" id="imageScalingWidth" name="imageScalingWidth" value={this.state.width} onChange={this.handleWidthChange}>
                                                    </Form.Control>
                                                </td>
                                            </tr>
                                        }
                                        <tr>
                                            <td colSpan="4">
                                                <div style={{ border: "1px dotted black", overflow: "scroll", overflowX: "scroll", overflowY: "scroll", width: "500px", height: "550px" }}>
                                                    {this.state.selectedFile ? (<Image alt="uploaded" src={this.state.selectedFile} />) : "No File Uploaded"}
                                                </div>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td colSpan="4">
                                                <Button variant="primary" onClick={this.handleSubmit}>Submit</Button>
                                            </td>
                                        </tr>
                                    </tbody>
                                </Table>
                            </td>
                            <td style={{ width: "50%" }}>
                                {this.state.imagescaled &&
                                    <tr>
                                        <td>
                                            <Button variant="outline-primary" onClick={this.downloadFile}>Download</Button>
                                        </td>
                                    </tr>
                                }
                                <tr>
                                    <td>
                                        {this.state.loading ?
                                            <Spinner animation="grow" />
                                            :
                                            <div style={{ border: "1px dotted black", overflow: "scroll", overflowX: "scroll", overflowY: "scroll", width: "550px", height: "600px" }}>
                                                {this.state.imagescaled ? (<Image alt="sampled" src={this.state.imagescaled} />) : "Not Available "}
                                            </div>
                                        }
                                    </td>
                                </tr>
                            </td>
                        </tr>
                    </tbody>
                </Table>
            </Container >

        );
    }
}