import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Col, Container, Form, Row, Image } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

type PageInfo = {
  title: string;
  url: string;
  description?: string;
  image?: string;
  tag?: string;
};

function App() {
  const { handleSubmit, register } = useForm();
  const [apiEndpointUrl, setApiEndpointUrl] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [tag, setTag] = useState('');
  const [categories, setCategories] = useState<string[]>([]);

  const onSubmit = (data: any) => {
    const submitData = {
      title: data.title,
      url: data.url,
      category: data.category,
      description: data.description,
      image: image,
      tag: data.tag.split('\n'),
    };
    console.log(submitData);
    fetch(`${apiEndpointUrl}/api/post`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify(submitData),
    }).then((res) => {
      if (res.ok) {
        window.close();
      }
    });
  };

  const getTitle = () => {
    const title = document.title;
    const url = document.location.href;
    const meta = Array.from(document.getElementsByTagName('meta'));
    const description =
      meta.find((m) => m.getAttribute('property') === 'og:description')?.getAttribute('content') ||
      meta.find((m) => m.getAttribute('name') === 'description')?.getAttribute('content') ||
      '';
    const image =
      meta.find((m) => m.getAttribute('property') === 'og:image')?.getAttribute('content') || meta.find((m) => m.getAttribute('name') === 'image')?.getAttribute('content') || '';
    const tag =
      meta.find((m) => m.getAttribute('property') === 'og:keywords')?.getAttribute('content') ||
      meta.find((m) => m.getAttribute('name') === 'keywords')?.getAttribute('content') ||
      meta
        .filter((m) => m.getAttribute('property') === 'article:tag')
        .map((t) => t.getAttribute('content'))
        .join(',') ||
      '';
    const pageInfo: PageInfo = {
      title,
      url,
      description,
      image,
      tag: tag?.replaceAll(',', '\n'),
    };
    return pageInfo;
  };

  useEffect(() => {
    chrome.storage.sync.get(
      {
        apiEndpointUrl: 'https://fluid.example.com',
        apiToken: '',
      },
      (items) => {
        setApiEndpointUrl(items.apiEndpointUrl);
        setApiToken(items.apiToken);

        const loadPageData = async () => {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          chrome.scripting.executeScript(
            {
              target: { tabId: tab.id || 0, allFrames: true },
              func: getTitle,
            },
            ([res]) => {
              const result: PageInfo = res.result;
              setTitle(result.title);
              setUrl(result.url);
              setDescription(result.description || '');
              setImage(result.image || '');
              setTag(result.tag || '');
            }
          );
        };

        loadPageData();
      }
    );
  }, []);

  return (
    <Container fluid>
      <Col md={12}>
        <Row>
          <form onSubmit={handleSubmit(onSubmit)} style={{ width: '100%' }}>
            <Form.Group>
              <Form.Control type='text' placeholder='Title' size='sm' defaultValue={title} {...register('title', { required: true })} />
            </Form.Group>
            <Form.Group>
              <Form.Control type='text' placeholder='URL' size='sm' defaultValue={url} {...register('url', { required: true })} />
            </Form.Group>
            <Form.Group>
              <Form.Control type='text' list='categories' size='sm' placeholder='Category' defaultValue={categories[0]} {...register('category', { required: true })} />
              <datalist id='categories'>
                {categories.map((c, i) => (
                  <option key={i} value={c} />
                ))}
              </datalist>
            </Form.Group>
            <Form.Group>
              <Form.Control as='textarea' rows={6} size='sm' placeholder='Description' defaultValue={description} {...register('description')} />
            </Form.Group>
            <Form.Group>{image !== '' ? <Image src={image} thumbnail></Image> : <></>}</Form.Group>
            <Form.Group>
              <Form.Control as='textarea' rows={6} size='sm' placeholder='tag' defaultValue={tag} {...register('tag')} />
            </Form.Group>
            <Button variant='primary' type='submit' size='sm' style={{ width: '100%' }}>
              Submit
            </Button>
          </form>
        </Row>
      </Col>
    </Container>
  );
}

export default App;
