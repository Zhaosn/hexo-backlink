/*************************************************
 * Copyright (c) 2023.
 * Author: Cyrusky <bo.jin@borgor.cn>
 *************************************************/
import fs from "hexo-fs";
import path from "path";

const base_dir = path.join(hexo.source_dir, "_posts");

/**
 * Process the file path and generate standardized file information
 * @param each File path
 * @returns Object containing file information
 */
function processFilePath(each) {
  // Handle Windows path separators
  if (path.sep === "\\") {
    each = each.replace(new RegExp("\\" + path.sep, "g"), "/");
  }
  
  // Split path into components
  const array = each.split("/");
  const fileNameExt = array.length === 0 ? "" : array[array.length - 1];
  const articleName = each.replace(/\.md$/, "");
  
  return {
    fileNameExt,
    filePath: each,
    articleName,
    fullPath: each
  };
}

/**
 * Find a file by its full path or file name
 * @param realNameExt File name with extension or full path
 * @returns The found file object or undefined
 */
function findFile(realNameExt: string) {
  // Process relative paths, converting them to normalized paths
  let normalizedPath = realNameExt.replace(/^\.\//, '');
  // Remove all ../ prefixes
  while (normalizedPath.startsWith('../')) {
    normalizedPath = normalizedPath.substring(3);
  }

  // First try to find by normalized path
  let file = fileList.find((file) => file.filePath === normalizedPath);
  if (file) return file;
  
  // If not found, try by full path
  file = fileList.find((file) => file.filePath === realNameExt);
  if (file) return file;
  
  // If not found, try by file name
  return fileList.find((file) => file.fileNameExt === realNameExt);
}

const fileList = fs
  .listDirSync(base_dir, {
    ignorePattern: /node_modules/,
  })
  .filter((each) => each && /\.md$/.test(each))
  .map(processFilePath);

/**
 * md returns true
 * @param {*} data
 */
const ignore = (data) => {
  const source = data.source;
  const ext = source.substring(source.lastIndexOf(".")).toLowerCase();
  return ext !== ".md";
};

function action(data) {
  let { content } = data;
  let result = content.match(/\[\[.*?]]/g);
  if (result && result.length > 0) {
    result.forEach((linkName: string) => {
      let [realName, showName] = (linkName + "")
        .replace("[[", "")
        .replace("]]", "")
        .split("|");
      let anchor = null;
      [realName, anchor] = realName.split("#");
      // Check if realName already has .md extension
      let realNameExt = realName.endsWith(".md") ? realName : realName + ".md";
      let file = findFile(realNameExt);
      if (file) {
        // If the target article was found. then replace the backlink with 'post_link'
        if (anchor) {
          // For links with anchor, use direct HTML link to preserve anchor
          content = content.replace(
            linkName,
            `<a href="/${file.articleName}#${anchor}">${showName || realName.replace(/^(\.\.\/)+/, '').replace(/^\.\//, '')} > ${anchor}</a>`,
          );
        } else {
          // For regular links, use post_link tag
          content = content.replace(
            linkName,
            `{% post_link ${file.articleName} '${showName || realName}' %}`,
          );
        }
      }
    });
  }
  data.content = content;
  return data;
}

hexo.extend.filter.register(
  "before_post_render",
  function (data) {
    let { config } = this;
    if (config.backlink) {
      if (!ignore(data)) {
        action(data);
      }
    }
  },
  0,
);