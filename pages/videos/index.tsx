import { NextPage } from "next";
import Page from "../../components/Page";
import publisher from "../../publisher.json";
import { createReadableDate, sortByPublished } from "../../utils";
import { useState } from "react";

const Videos: NextPage<{
  videos: typeof publisher.videos;
}> = ({ videos }) => {
  const [selectedTags, updateSelectedTags] = useState([]);

  function toggleTag(tag) {
    if (selectedTags.includes(tag)) {
      updateSelectedTags(
        selectedTags.filter((existingTag) => existingTag !== tag)
      );
    } else {
      updateSelectedTags(selectedTags.concat(tag));
    }
  }

  const videosList = Object.keys(videos)
    .filter((tag) => !selectedTags.length || selectedTags.includes(tag))
    .reduce((aggr, tag) => aggr.concat(videos[tag]), [])
    .sort(sortByPublished);

  return (
    <Page>
      <div className="content">
        <style jsx>{`
          .content {
            width: 100%;
          }
          .tags {
            display: flex;
            margin-bottom: 1rem;
          }
          .tag {
            font-size: 12px;
            background-color: #eaeaea;
            border-radius: 3px;
            padding: 0.25rem 0.5rem;
            margin: 0 0.5rem;
            color: #666;
            cursor: pointer;
          }
          .tag.selected {
            background-color: #ed2939;
            color: #fafafa;
          }
          .tag:hover {
            background-color: #f0f0f0;
          }
          .tag.selected:hover {
            background-color: #ed2939;
          }
          .list {
            list-style-type: none;
            margin: 0;
            padding: 0;
          }
          .item {
            display: flex;
            padding: 1rem;
            cursor: pointer;
            align-items: center;
            font-size: 14px;
            border-radius: 3px;
            color: #333;
            text-decoration: none;
          }
          .item:hover {
            background-color: #f0f0f0;
          }
          .item img {
            width: 100px;
            margin-right: 1rem;
          }
          .item h3 {
            font-size: 18px;
            margin: 0.5rem 0;
          }
          .item-details {
            display: flex;
            flex-direction: column;
          }
          .item-meta {
            display: flex;
            margin: 0.5rem 0;
          }
          .item-meta > div {
            margin-right: 1rem;
          }
          @media (max-width: 700px) {
            .item img {
              width: 50px;
            }
            .item-details {
              width: 100%;
            }
            .item-details h3 {
              font-size: 14px;
            }
            .item-meta {
              display: none;
            }
          }
        `}</style>
        <div className="tags">
          {Object.keys(videos).map((tag) => (
            <div
              key={tag}
              className={`tag${selectedTags.includes(tag) ? " selected" : ""}`}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </div>
          ))}
        </div>
        <ul className="list">
          {videosList.map((video) => (
            <li key={video.youtubeId}>
              <a
                className="item"
                href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
                target="_blank"
              >
                <div>
                  <img
                    src={`https://img.youtube.com/vi/${video.youtubeId}/default.jpg`}
                  />
                </div>
                <div className="item-details">
                  <h3>{video.title}</h3>
                  <div>{video.description}</div>
                  <div className="item-meta">
                    <div>
                      <strong>duration:</strong> {video.duration}
                    </div>
                    <div>
                      <strong>published:</strong>{" "}
                      {createReadableDate(video.published)}
                    </div>
                  </div>
                </div>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </Page>
  );
};

Videos.getInitialProps = async () => {
  const videos = publisher.videos;

  return {
    videos,
  };
};

export default Videos;
