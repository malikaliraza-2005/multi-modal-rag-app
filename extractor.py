def get_images(elements):
    images=[]
    for element in elements:
           if element.category == "Image":
            images.append(element)
    print(f"Images found: {len(images)}")
    return images

def get_tables(elements):
    tables=[]
    for element in elements:
        if element.category == "Table":
            tables.append(element)
    print(f"Tables found: {len(tables)}")
    return tables