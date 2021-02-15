import React from 'react';
import axios from 'axios';
import Container from 'react-bootstrap/Container';
import Alert from 'react-bootstrap/Alert';
import Image from 'react-bootstrap/Image';
import Table from 'react-bootstrap/Table';
import Modal from 'react-bootstrap/Modal';

//Get API URL from Process
export const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000/";
export const API_KEY = process.env.REACT_APP_API_KEY || "IMAGEAPIKEY20210206SERVERLESS";

//export const API_URL = process.env.REACT_APP_API_URL || "https://emif67ed49.execute-api.us-east-2.amazonaws.com/Prod/";



export default class ImageList extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            imagelist: [],
            iserror: false,
            error: '',
            imageOriginal: null,
            imageResized: null,
            show: false
        };
        this.getImages = this.getImages.bind(this);
        this.handleImageClick = this.handleImageClick.bind(this);
        this.handleClose = this.handleClose.bind(this);
    }

    componentDidMount() {
        this.setState({
            iserror: false,
            error: '',
        });
        this.getImages().then((data) => {
            this.setState({ imagelist: data });

        }).catch((error) => {
            console.log('Error processing image list request: ' + error);
            this.setState({ iserror: true, error: "Error invoking image service api." })
        });
    }

    handleImageClick = (imageid) => {

        this.setState({
            imageOriginal: null,
            imageResized: null,
            iserror: false,
            error: '',
            show: false
        });

        this.getImage(imageid).then((data) => {
            this.setState(
                {
                    imageOriginal: "data:image/png;base64," + data.original,
                    imageResized: "data:image/png;base64," + data.resized,
                    show: true
                }
            );
        }).catch((error) => {
            console.log('Error processing image list request: ' + error);
            this.setState({ iserror: true, error: "Error invoking image service api." })
        });
    };

    handleClose = () => {
        this.setState({ imageOriginal: null, imageResized: null, show: false });
    }

    getImages = async () => {
        let data = [];

        const response = await axios.get(API_URL + "images", {
            headers: {
                "Content-Type": "application/json",
                "x-api-key": API_KEY
            }
        });

        if (response.data) {
            response.data.images.forEach(imagedata => {
                data.push({
                    imageid: imagedata.id,
                    imagedate: imagedata.dateUploaded,
                    image: "data:image/png;base64," + imagedata.thumbnail
                });
            });
        }
        return data;
    }

    getImage = async (imageID) => {
        const response = await axios.get(API_URL + "images/" + imageID, {
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
                <Container>&nbsp;</Container>
                <Container>
                    <Alert show={this.state.iserror} variant="danger"><p>{this.state.error}</p></Alert>
                </Container>
                <Table striped responsive bordered variant="dark" size="sm">
                    <thead>
                        <tr>
                            <th class="text-center" style={{ width: "25%" }}>Date Added</th>
                            <th class="text-center" style={{ width: "75%" }}>Image</th>
                        </tr>
                    </thead>
                    <tbody>
                        {this.state.imagelist.map((imagedata, index) => {
                            return (
                                <tr key={imagedata.imageid}>
                                    <td>{imagedata.imagedate}</td>
                                    <td><Image alt="uploaded" src={imagedata.image} onClick={() => this.handleImageClick(imagedata.imageid)} /></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </Table>
                <Modal size="xl" dialogClassName="modal-90w" scrollable="true" show={this.state.show} onHide={this.handleClose}>
                    <Modal.Header closeButton></Modal.Header>
                    <Modal.Body>
                        {this.state.imageOriginal &&
                            <Table bordered striped variant="dark" size="sm">
                                <thead>
                                    <tr>
                                        <th class="text-center" style={{ width: "50%" }}>Original</th>
                                        <th class="text-center" style={{ width: "50%" }}>Sampled</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>
                                            <div style={{ border: "1px dotted black", overflow: "scroll", overflowX: "scroll", overflowY: "scroll", width: "550px", height: "600px", align: "center" }}>
                                                {this.state.imageOriginal ? (<Image alt="original" src={this.state.imageOriginal} />) : ""}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ border: "1px dotted black", overflow: "scroll", overflowX: "scroll", overflowY: "scroll", width: "550px", height: "600px", align: "center" }}>
                                                {this.state.imageResized ? (<Image alt="resized" src={this.state.imageResized} />) : ""}
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </Table>
                        }
                    </Modal.Body>
                </Modal>
            </Container >
        );
    }
}

